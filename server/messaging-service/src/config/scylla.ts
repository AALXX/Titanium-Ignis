import { Client, auth } from 'cassandra-driver'
import config from './config'

let client = new Client({
    contactPoints: config.scylla.contactPoints, // Replace with your ScyllaDB node's IP or hostname
    localDataCenter: config.scylla.localDataCenter, // Replace with your local data center name
    keyspace: config.scylla.keyspace,
    authProvider: new auth.PlainTextAuthProvider(config.scylla.user, config.scylla.password)
})

/**
 * Connect to ScyllaDB
 */
const SCYconnect = async () => {
    try {
        await client.connect()
    } catch (error) {
        console.error('Connection error', error)
        setTimeout(() => {
            client = new Client({
                contactPoints: config.scylla.contactPoints, // Replace with your ScyllaDB node's IP or hostname
                localDataCenter: config.scylla.localDataCenter, // Replace with your local data center name
                keyspace: config.scylla.keyspace,
                authProvider: new auth.PlainTextAuthProvider(config.scylla.user, config.scylla.password)
            })
        }, 5000)
    }
}

/**
 * Execute query
 * @param {string} query
 * @returns
 */
async function SCYquery(query: string) {
    try {
        const dbresult = await client.execute(query)
        let result = JSON.parse(JSON.stringify(dbresult))
        return result.rows
    } catch (error) {
        console.error('Query error', error)
    }
}

export { SCYconnect, SCYquery }
