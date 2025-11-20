import { Server, Socket } from 'socket.io'
import { Pool } from 'pg'
import { connect, query } from '../config/postgresql'
import logging from '../config/logging'
import http from 'http'
import httpProxy from 'http-proxy'

// Map to store proxy servers by deployment
const activeProxies = new Map<
    string,
    {
        proxyServer: http.Server
        httpProxy: httpProxy
        proxyPort: number
        containerPort: number
        isLogging: boolean
    }
>()

interface RequestLog {
    projectToken: string
    deploymentToken: string
    containerId: string
    method: string
    path: string
    status: number
    responseTime: number
    requestIp: string
    userAgent: string
    referer: string
    headers: any
    queryParams: any
    requestBody: string
    responseBody: string
    errorDetails: string | null
}

const logRequest = async (pool: Pool, logData: RequestLog) => {
    try {
        const connection = await connect(pool)
        const insertQuery = `
            INSERT INTO request_logs (
                projecttoken, deploymenttoken, containerid, method, path, 
                status, responsetime, requestip, useragent, referer,
                headers, queryparams, requestbody, responsebody, errordetails
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `

        const result = await query(connection!, insertQuery, [
            logData.projectToken,
            logData.deploymentToken,
            logData.containerId,
            logData.method,
            logData.path,
            logData.status,
            logData.responseTime,
            logData.requestIp,
            logData.userAgent,
            logData.referer,
            JSON.stringify(logData.headers),
            JSON.stringify(logData.queryParams),
            logData.requestBody,
            logData.responseBody,
            logData.errorDetails
        ])

        connection!.release()
        return result[0]
    } catch (error: any) {
        logging.error('LOG_REQUEST', error.message)
        throw error
    }
}

export const createRequestProxy = (
    pool: Pool,
    io: Server,
    projectToken: string,
    deploymentToken: string,
    containerId: string,
    containerPort: number,
    proxyPort: number
): { proxyServer: http.Server; httpProxy: httpProxy } => {
    const proxy = httpProxy.createProxyServer({
        target: `http://127.0.0.1:${containerPort}`,
        changeOrigin: true,
        ws: true,
        preserveHeaderKeyCase: true
    })

    const proxyKey = `${projectToken}-${deploymentToken}`

    const server = http.createServer(async (req, res) => {
        const proxyInfo = activeProxies.get(proxyKey)
        const isLogging = proxyInfo?.isLogging ?? false

        if (!isLogging) {
            proxy.web(req, res)
            return
        }

        const startTime = Date.now()
        let requestBody = ''
        let responseBody = ''

        req.on('data', chunk => {
            requestBody += chunk.toString()
        })

        const url = new URL(req.url || '', `http://${req.headers.host}`)
        const queryParams: any = {}
        url.searchParams.forEach((value, key) => {
            queryParams[key] = value
        })

        const originalWrite = res.write.bind(res)
        const originalEnd = res.end.bind(res)
        const chunks: Buffer[] = []

        res.write = function (chunk: any, ...args: any[]): boolean {
            if (chunk) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            return originalWrite(chunk, ...args)
        }

        res.end = function (chunk: any, ...args: any[]): any {
            if (chunk) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            responseBody = Buffer.concat(chunks).toString('utf8')
            return originalEnd(chunk, ...args)
        }

        proxy.web(req, res, {}, async error => {
            const responseTime = Date.now() - startTime
            const logData: RequestLog = {
                projectToken,
                deploymentToken,
                containerId,
                method: req.method || 'GET',
                path: req.url || '/',
                status: error ? 502 : res.statusCode,
                responseTime,
                requestIp: req.socket.remoteAddress || 'unknown',
                userAgent: req.headers['user-agent'] || '',
                referer: req.headers['referer'] || '',
                headers: req.headers,
                queryParams,
                requestBody: requestBody.substring(0, 5000),
                responseBody: responseBody.substring(0, 5000),
                errorDetails: error ? error.message : null
            }

            try {
                const savedLog = await logRequest(pool, logData)
                io.to(projectToken).emit('request-logged', {
                    deploymentToken,
                    request: {
                        id: savedLog.id.toString(),
                        method: savedLog.method,
                        path: savedLog.path,
                        status: savedLog.status,
                        time: savedLog.responsetime.toString(),
                        timestamp: savedLog.timestamp,
                        ip: savedLog.requestip
                    }
                })
            } catch (logError: any) {
                logging.error('REQUEST_LOG_SAVE', logError.message)
            }
        })

        res.on('finish', async () => {
            const responseTime = Date.now() - startTime
            const logData: RequestLog = {
                projectToken,
                deploymentToken,
                containerId,
                method: req.method || 'GET',
                path: req.url || '/',
                status: res.statusCode,
                responseTime,
                requestIp: req.socket.remoteAddress || 'unknown',
                userAgent: req.headers['user-agent'] || '',
                referer: req.headers['referer'] || '',
                headers: req.headers,
                queryParams,
                requestBody: requestBody.substring(0, 5000),
                responseBody: responseBody.substring(0, 5000),
                errorDetails: null
            }

            try {
                const savedLog = await logRequest(pool, logData)
                io.to(projectToken).emit('request-logged', {
                    deploymentToken,
                    request: {
                        id: savedLog.id.toString(),
                        method: savedLog.method,
                        path: savedLog.path,
                        status: savedLog.status,
                        time: savedLog.responsetime.toString(),
                        timestamp: savedLog.timestamp,
                        ip: savedLog.requestip
                    }
                })
            } catch (logError: any) {
                logging.error('REQUEST_LOG_SAVE', logError.message)
            }
        })
    })

    server.on('upgrade', (req, socket, head) => {
        proxy.ws(req, socket, head)
    })

    server.listen(proxyPort, '0.0.0.0', () => {
        logging.info('REQUEST_PROXY', `Proxy listening on port ${proxyPort} -> container port ${containerPort}`)
    })

    activeProxies.set(proxyKey, {
        proxyServer: server,
        httpProxy: proxy,
        proxyPort,
        containerPort,
        isLogging: false
    })

    return { proxyServer: server, httpProxy: proxy }
}

const enableRequestTracking = async (pool: Pool, io: Server, socket: Socket, projectToken: string, deploymentToken: string) => {
    try {
        const proxyKey = `${projectToken}-${deploymentToken}`
        const proxyInfo = activeProxies.get(proxyKey)

        if (!proxyInfo) {
            return socket.emit('tracking-error', {
                error: true,
                errmsg: 'Deployment proxy not found. This deployment may not support request tracking.'
            })
        }

        if (proxyInfo.isLogging) {
            return socket.emit('tracking-already-enabled', {
                deploymentToken,
                message: 'Request tracking is already enabled'
            })
        }

        proxyInfo.isLogging = true
        activeProxies.set(proxyKey, proxyInfo)

        const connection = await connect(pool)
        const updateQuery = `
UPDATE projects_deployments 
SET additionalinfo = COALESCE(additionalinfo, '{}'::jsonb) ||
        jsonb_build_object(
            'requestTracking', jsonb_build_object(
                'proxyPort', $1::int,
                'containerPort', $2::int
            )
        ),
    requesttrackingenabled = true
WHERE deploymenttoken = $3;
        `
        await query(connection!, updateQuery, [proxyInfo.proxyPort, proxyInfo.containerPort, deploymentToken])
        connection!.release()

        socket.emit('tracking-enabled', {
            deploymentToken,
            port: proxyInfo.proxyPort,
            message: `Request tracking enabled! Access your deployment at http://localhost:${proxyInfo.proxyPort}`
        })

        logging.info('REQUEST_TRACKING', `Enabled for deployment ${deploymentToken}`)
    } catch (error: any) {
        logging.error('ENABLE_REQUEST_TRACKING', error.message)
        socket.emit('tracking-error', {
            error: true,
            errmsg: 'Failed to enable request tracking'
        })
    }
}

const disableRequestTracking = async (pool: Pool, io: Server, socket: Socket, projectToken: string, deploymentToken: string) => {
    try {
        const proxyKey = `${projectToken}-${deploymentToken}`
        const proxyInfo = activeProxies.get(proxyKey)

        if (!proxyInfo) {
            return socket.emit('tracking-error', {
                error: true,
                errmsg: 'Deployment proxy not found'
            })
        }

        if (!proxyInfo.isLogging) {
            return socket.emit('tracking-error', {
                error: true,
                errmsg: 'Request tracking is not enabled'
            })
        }

        proxyInfo.isLogging = false
        activeProxies.set(proxyKey, proxyInfo)

        const connection = await connect(pool)
        const updateQuery = `
            UPDATE projects_deployments 
            SET requesttrackingenabled=false
            WHERE deploymenttoken = $1
        `
        await query(connection!, updateQuery, [deploymentToken])
        connection!.release()

        socket.emit('tracking-disabled', {
            deploymentToken,
            message: 'Request tracking disabled. Proxy continues to run without logging.'
        })

        logging.info('REQUEST_TRACKING', `Disabled for deployment ${deploymentToken}`)
    } catch (error: any) {
        logging.error('DISABLE_REQUEST_TRACKING', error.message)
        socket.emit('tracking-error', {
            error: true,
            errmsg: 'Failed to disable request tracking'
        })
    }
}

const getRequestLogs = async (pool: Pool, socket: Socket, projectToken: string, deploymentToken: string, limit: number = 50) => {
    try {
        const connection = await connect(pool)
        const getLogsQuery = `
            SELECT id, method, path, status, responsetime, requestip, timestamp
            FROM request_logs
            WHERE projecttoken = $1 AND deploymenttoken = $2
            ORDER BY timestamp DESC
            LIMIT $3
        `

        const logs = await query(connection!, getLogsQuery, [projectToken, deploymentToken, limit])
        connection!.release()

        const formattedLogs = logs.map((log: any) => ({
            id: log.id.toString(),
            method: log.method,
            path: log.path,
            status: log.status,
            time: log.responsetime.toString(),
            timestamp: log.timestamp,
            ip: log.requestip
        }))

        socket.emit('request-logs', {
            deploymentToken,
            logs: formattedLogs
        })
    } catch (error: any) {
        logging.error('GET_REQUEST_LOGS', error.message)
        socket.emit('tracking-error', {
            error: true,
            errmsg: 'Failed to fetch request logs'
        })
    }
}

const clearRequestLogs = async (pool: Pool, socket: Socket, projectToken: string, deploymentToken: string) => {
    try {
        const connection = await connect(pool)
        const deleteQuery = `
            DELETE FROM request_logs
            WHERE projecttoken = $1 AND deploymenttoken = $2
        `
        await query(connection!, deleteQuery, [projectToken, deploymentToken])
        connection!.release()

        socket.emit('request-logs-cleared', {
            deploymentToken,
            message: 'Request logs cleared'
        })
    } catch (error: any) {
        logging.error('CLEAR_REQUEST_LOGS', error.message)
        socket.emit('tracking-error', {
            error: true,
            errmsg: 'Failed to clear request logs'
        })
    }
}

export default {
    enableRequestTracking,
    disableRequestTracking,
    getRequestLogs,
    clearRequestLogs
}
