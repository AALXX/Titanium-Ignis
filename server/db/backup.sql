--
-- PostgreSQL database cluster dump
--

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE alx;
ALTER ROLE alx WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:bCNHToWSEcgcAoUFNRmmzw==$+EgH12xOTWzwwdkTlrM4VXp4wT9M3k5OZnnbO6hIlOY=:ulRyGb48azpM4doygAHg41OP0pi6tiy21OS5BjwaGBo=';

--
-- User Configurations
--








--
-- Databases
--

--
-- Database "template1" dump
--

\connect template1

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.0
-- Dumped by pg_dump version 16.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

--
-- Database "mda_db" dump
--

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.0
-- Dumped by pg_dump version 16.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: mda_db; Type: DATABASE; Schema: -; Owner: alx
--

CREATE DATABASE mda_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE mda_db OWNER TO alx;

\connect mda_db

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: actions; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.actions (
    id integer NOT NULL,
    name character varying(20) NOT NULL
);


ALTER TABLE public.actions OWNER TO alx;

--
-- Name: actions_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.actions_id_seq OWNER TO alx;

--
-- Name: actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.actions_id_seq OWNED BY public.actions.id;


--
-- Name: active_services; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.active_services (
    id integer NOT NULL,
    project_token text NOT NULL,
    service_token text NOT NULL,
    service_name text NOT NULL,
    service_id integer NOT NULL,
    service_status text NOT NULL
);


ALTER TABLE public.active_services OWNER TO alx;

--
-- Name: active_services_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.active_services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.active_services_id_seq OWNER TO alx;

--
-- Name: active_services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.active_services_id_seq OWNED BY public.active_services.id;


--
-- Name: banner_tasks; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.banner_tasks (
    id integer NOT NULL,
    taskuuid character varying(250) NOT NULL,
    containeruuid character varying(250) NOT NULL,
    taskname character varying(250) NOT NULL,
    taskdescription text,
    assignedmemberprivatetoken character varying(250),
    createdbyuserprivatetoken character varying(250) NOT NULL,
    taskstatus character varying(50) NOT NULL,
    taskimportance character varying(50) NOT NULL,
    taskcreateddate timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    taskduedate timestamp with time zone NOT NULL,
    taskcompleteddate timestamp with time zone,
    taskestimatedhours numeric(5,2),
    taskactualhours numeric(5,2),
    tasklabels text[],
    taskattachmentscount integer DEFAULT 0,
    taskcommentscount integer DEFAULT 0,
    taskreminderdate timestamp with time zone,
    taskisarchived boolean DEFAULT false,
    tasklastupdated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    tasklastupdatedby character varying(250),
    taskdependencies text[],
    taskcustomfields jsonb
);


ALTER TABLE public.banner_tasks OWNER TO alx;

--
-- Name: banner_tasks_containers; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.banner_tasks_containers (
    id integer NOT NULL,
    bannertoken character varying(250) NOT NULL,
    containername character varying(250) NOT NULL,
    containeruuid character varying(250) NOT NULL,
    containerorder integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.banner_tasks_containers OWNER TO alx;

--
-- Name: banner_tasks_containers_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.banner_tasks_containers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.banner_tasks_containers_id_seq OWNER TO alx;

--
-- Name: banner_tasks_containers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.banner_tasks_containers_id_seq OWNED BY public.banner_tasks_containers.id;


--
-- Name: banner_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.banner_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.banner_tasks_id_seq OWNER TO alx;

--
-- Name: banner_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.banner_tasks_id_seq OWNED BY public.banner_tasks.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    resourceid integer NOT NULL,
    actionid integer NOT NULL
);


ALTER TABLE public.permissions OWNER TO alx;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO alx;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: project_divisions; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.project_divisions (
    id integer NOT NULL,
    projecttoken character varying(250) NOT NULL,
    divisionname character varying(250) NOT NULL,
    numberofmembers integer NOT NULL
);


ALTER TABLE public.project_divisions OWNER TO alx;

--
-- Name: project_divisions_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.project_divisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_divisions_id_seq OWNER TO alx;

--
-- Name: project_divisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.project_divisions_id_seq OWNED BY public.project_divisions.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    projectname text NOT NULL,
    projectdescription text NOT NULL,
    projecttoken text NOT NULL,
    projectownertoken text NOT NULL,
    status text DEFAULT 'Started'::text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.projects OWNER TO alx;

--
-- Name: projects_codebase; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.projects_codebase (
    id integer NOT NULL,
    projecttoken text NOT NULL,
    repositoryurl text NOT NULL,
    lastusercommitusertoken text NOT NULL,
    projecttype text NOT NULL,
    CONSTRAINT projects_codebase_projecttype_check CHECK ((projecttype = ANY (ARRAY['git'::text, 'svn'::text])))
);


ALTER TABLE public.projects_codebase OWNER TO alx;

--
-- Name: projects_codebase_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.projects_codebase_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_codebase_id_seq OWNER TO alx;

--
-- Name: projects_codebase_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.projects_codebase_id_seq OWNED BY public.projects_codebase.id;


--
-- Name: projects_deployments; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.projects_deployments (
    id integer NOT NULL,
    projecttoken text NOT NULL,
    serviceid integer NOT NULL,
    name character varying(50) NOT NULL,
    type character varying(50) NOT NULL,
    branch character varying(50) NOT NULL,
    version character varying(50) NOT NULL,
    deploymenturl text,
    server character varying(50) NOT NULL,
    deployedat timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) NOT NULL
);


ALTER TABLE public.projects_deployments OWNER TO alx;

--
-- Name: projects_deployments_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.projects_deployments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_deployments_id_seq OWNER TO alx;

--
-- Name: projects_deployments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.projects_deployments_id_seq OWNED BY public.projects_deployments.id;


--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_id_seq OWNER TO alx;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: projects_task_banners; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.projects_task_banners (
    id integer NOT NULL,
    projecttoken character varying(250) NOT NULL,
    bannertoken character varying(250) NOT NULL,
    bannername character varying(250) NOT NULL,
    departamentassignedto integer NOT NULL,
    assigneeprivatetoken character varying(250) NOT NULL
);


ALTER TABLE public.projects_task_banners OWNER TO alx;

--
-- Name: projects_task_banners_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.projects_task_banners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_task_banners_id_seq OWNER TO alx;

--
-- Name: projects_task_banners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.projects_task_banners_id_seq OWNED BY public.projects_task_banners.id;


--
-- Name: projects_team_members; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.projects_team_members (
    id integer NOT NULL,
    projecttoken character varying(250) NOT NULL,
    userprivatetoken character varying(250) NOT NULL,
    roleid integer NOT NULL,
    divisionid integer
);


ALTER TABLE public.projects_team_members OWNER TO alx;

--
-- Name: projects_team_members_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.projects_team_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_team_members_id_seq OWNER TO alx;

--
-- Name: projects_team_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.projects_team_members_id_seq OWNED BY public.projects_team_members.id;


--
-- Name: resources; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.resources (
    id integer NOT NULL,
    name character varying(30) NOT NULL,
    description text
);


ALTER TABLE public.resources OWNER TO alx;

--
-- Name: resources_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.resources_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resources_id_seq OWNER TO alx;

--
-- Name: resources_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.resources_id_seq OWNED BY public.resources.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.role_permissions (
    roleid integer NOT NULL,
    permissionid integer NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO alx;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    level integer NOT NULL,
    category character varying(30) NOT NULL,
    CONSTRAINT roles_category_check CHECK (((category)::text = ANY ((ARRAY['PROJECT_MANAGEMENT'::character varying, 'TECHNICAL_LEADERSHIP'::character varying, 'DEVELOPMENT'::character varying, 'QUALITY_ASSURANCE'::character varying, 'SPECIALIZED'::character varying, 'STAKEHOLDER'::character varying, 'DESIGN'::character varying, 'SUPPORT'::character varying])::text[])))
);


ALTER TABLE public.roles OWNER TO alx;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO alx;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: task_container_junction_table; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.task_container_junction_table (
    id integer NOT NULL,
    containeruuid character varying(250) NOT NULL,
    taskuuid character varying(250) NOT NULL
);


ALTER TABLE public.task_container_junction_table OWNER TO alx;

--
-- Name: task_container_junction_table_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.task_container_junction_table_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.task_container_junction_table_id_seq OWNER TO alx;

--
-- Name: task_container_junction_table_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.task_container_junction_table_id_seq OWNED BY public.task_container_junction_table.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: alx
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(30) NOT NULL,
    useremail character varying(50) NOT NULL,
    userpwd character varying(80) NOT NULL,
    userprivatetoken character varying(250) NOT NULL,
    userpublictoken character varying(250) NOT NULL,
    usersessiontoken character varying(250) NOT NULL,
    registrationtype text NOT NULL,
    CONSTRAINT users_registrationtype_check CHECK ((registrationtype = ANY (ARRAY['google'::text, 'credentials'::text])))
);


ALTER TABLE public.users OWNER TO alx;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: alx
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO alx;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alx
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: actions id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.actions ALTER COLUMN id SET DEFAULT nextval('public.actions_id_seq'::regclass);


--
-- Name: active_services id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.active_services ALTER COLUMN id SET DEFAULT nextval('public.active_services_id_seq'::regclass);


--
-- Name: banner_tasks id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.banner_tasks ALTER COLUMN id SET DEFAULT nextval('public.banner_tasks_id_seq'::regclass);


--
-- Name: banner_tasks_containers id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.banner_tasks_containers ALTER COLUMN id SET DEFAULT nextval('public.banner_tasks_containers_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: project_divisions id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.project_divisions ALTER COLUMN id SET DEFAULT nextval('public.project_divisions_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: projects_codebase id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_codebase ALTER COLUMN id SET DEFAULT nextval('public.projects_codebase_id_seq'::regclass);


--
-- Name: projects_deployments id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_deployments ALTER COLUMN id SET DEFAULT nextval('public.projects_deployments_id_seq'::regclass);


--
-- Name: projects_task_banners id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_task_banners ALTER COLUMN id SET DEFAULT nextval('public.projects_task_banners_id_seq'::regclass);


--
-- Name: projects_team_members id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_team_members ALTER COLUMN id SET DEFAULT nextval('public.projects_team_members_id_seq'::regclass);


--
-- Name: resources id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.resources ALTER COLUMN id SET DEFAULT nextval('public.resources_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: task_container_junction_table id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.task_container_junction_table ALTER COLUMN id SET DEFAULT nextval('public.task_container_junction_table_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: actions; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.actions (id, name) FROM stdin;
13	create
14	read
15	update
16	delete
17	manage
18	approve
19	execute
20	design
21	analyze
22	test
23	develop
24	review
\.


--
-- Data for Name: active_services; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.active_services (id, project_token, service_token, service_name, service_id, service_status) FROM stdin;
1		dfc30aff-16fa-4677-a76f-2c9bdd9e2da7	clientService	1	started
\.


--
-- Data for Name: banner_tasks; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.banner_tasks (id, taskuuid, containeruuid, taskname, taskdescription, assignedmemberprivatetoken, createdbyuserprivatetoken, taskstatus, taskimportance, taskcreateddate, taskduedate, taskcompleteddate, taskestimatedhours, taskactualhours, tasklabels, taskattachmentscount, taskcommentscount, taskreminderdate, taskisarchived, tasklastupdated, tasklastupdatedby, taskdependencies, taskcustomfields) FROM stdin;
16	bd5f7c1d-2eea-4bc2-adf9-5bc7ec7f8770	3b2e8610-b993-42c9-9cd2-f112f132981d	repair git service	the git service iss not updated to the project db schema so it crashes	\N	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	To Do	Low	2025-03-08 22:16:32.049133+00	2025-03-08 22:15:57.417+00	\N	\N	\N	{}	0	0	\N	f	2025-03-08 22:16:32.049133+00	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	\N	[]
12	49209caf-c4a2-4c9c-b916-ba9ba97be751	521d890a-61cb-47f6-b94a-219dd7aeceb4	lexxx	dasd	\N	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	In Progress	Low	2025-03-07 23:06:39.125157+00	2025-03-23 00:00:00+00	\N	\N	\N	{}	0	0	\N	f	2025-03-07 23:06:39.125157+00	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	\N	[]
11	2ad79965-ff6d-4117-9ec7-d691c7f1d839	521d890a-61cb-47f6-b94a-219dd7aeceb4	asdasd	dasdasd	\N	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	To Do	High	2025-03-07 23:01:55.744114+00	2025-03-07 23:01:44.598+00	\N	\N	\N	{}	0	0	\N	f	2025-03-07 23:01:55.744114+00	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	\N	[]
15	9664eae1-20c3-4c40-8cca-afa669378dd6	7e2fae11-cea6-4a67-b81e-387b79e85ec8	Project Deployment	create a deployment tab that manages the deployed version of the app	\N	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	In Progress	Medium	2025-03-08 21:59:48.658939+00	2025-03-31 00:00:00+00	\N	\N	\N	{}	0	0	\N	f	2025-03-08 21:59:48.658939+00	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	\N	[]
13	d088f2b8-97f2-4b2b-948a-84cf61696ddc	521d890a-61cb-47f6-b94a-219dd7aeceb4	test	dsa	\N	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	Done	High	2025-03-08 18:17:46.557352+00	2025-03-08 18:17:35.822+00	\N	\N	\N	{}	0	0	\N	f	2025-03-08 18:17:46.557352+00	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	\N	[]
14	d4173a96-ac90-4d75-be55-42da328f3943	521d890a-61cb-47f6-b94a-219dd7aeceb4	add task read permision		\N	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	To Do	Medium	2025-03-08 19:13:22.392495+00	2025-03-08 19:13:01.181+00	\N	\N	\N	{}	0	0	\N	f	2025-03-08 19:13:22.392495+00	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	\N	[]
10	33355595-4380-4192-97d6-f674251d01ba	3b2e8610-b993-42c9-9cd2-f112f132981d	make task ddetailed view		\N	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	To Do	High	2025-03-07 22:39:40.881988+00	2025-03-09 00:00:00+00	\N	\N	\N	{}	0	0	\N	f	2025-03-07 22:39:40.881988+00	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	\N	[]
\.


--
-- Data for Name: banner_tasks_containers; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.banner_tasks_containers (id, bannertoken, containername, containeruuid, containerorder) FROM stdin;
23	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzg5MzI1MjB9.EX25CGh_pOTVRG5nK199aWFA3L54-L4nFZyQCDFOQPc	TODO	521d890a-61cb-47f6-b94a-219dd7aeceb4	1
24	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzg5MzI1MjB9.EX25CGh_pOTVRG5nK199aWFA3L54-L4nFZyQCDFOQPc	InProgress	7e2fae11-cea6-4a67-b81e-387b79e85ec8	2
22	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzg5MzI1MjB9.EX25CGh_pOTVRG5nK199aWFA3L54-L4nFZyQCDFOQPc	DDone	3b2e8610-b993-42c9-9cd2-f112f132981d	3
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.permissions (id, name, description, resourceid, actionid) FROM stdin;
28	TASK_CREATE	Create tasks and assignments	49	13
29	TASK_BANNER_CREATE	create tasks and assignments	48	13
30	DOCUMENTATION_WRITE	Write documentation	34	13
31	UI_DESIGN	Design UI components	32	13
32	CODE_WRITE	Write and commit code	26	13
33	PROJECT_CREATE	Create new projects	25	13
34	DOCUMENTATION_READ	Read documentation	34	14
35	API_READ	Access API endpoints	31	14
36	DATABASE_READ	Read database data	30	14
37	SECURITY_AUDIT	Perform security audits	29	14
38	PROJECT_VIEW	View project details	25	14
39	TASK_MANAGE	Manage tasks and assignments	49	17
40	TASK_BANNER_MANAGE	Manage tasks and assignments	48	17
41	BUDGET_MANAGE	Manage project budget	39	17
42	ROLE_MANAGE	Manage user roles	37	17
43	USER_MANAGE	Manage user accounts	36	17
44	CLOUD_MANAGE	Manage cloud resources	35	17
45	INFRASTRUCTURE_MANAGE	Manage infrastructure	35	17
46	TEST_MANAGE	Manage test suites	33	17
47	UI_MANAGE	Manage UI components	32	17
48	API_MANAGE	Manage API endpoints	31	17
49	DATABASE_MANAGE	Manage database settings	30	17
50	SECURITY_MANAGE	Manage security settings	29	17
51	ARCHITECTURE_MANAGE	Manage system architecture	27	17
52	PROJECT_MANAGE	Manage project settings and configuration	25	17
53	CODE_REVIEW	Review and approve code	26	18
54	TEST_EXECUTE	Execute tests	33	19
55	CODE_DEPLOY	Deploy code to production	28	19
\.


--
-- Data for Name: project_divisions; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.project_divisions (id, projecttoken, divisionname, numberofmembers) FROM stdin;
1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.umgKzVibDSJ6EsTbMPz-KHSfoiDwwj8W3JnOeV-ljsc	test	0
2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.umgKzVibDSJ6EsTbMPz-KHSfoiDwwj8W3JnOeV-ljsc	It Division	0
3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.umgKzVibDSJ6EsTbMPz-KHSfoiDwwj8W3JnOeV-ljsc	HR Division	0
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.projects (id, projectname, projectdescription, projecttoken, projectownertoken, status, created_at) FROM stdin;
5	test project	test the new create project pipeline	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.umgKzVibDSJ6EsTbMPz-KHSfoiDwwj8W3JnOeV-ljsc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	Started	2025-01-03 23:16:02.615922
\.


--
-- Data for Name: projects_codebase; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.projects_codebase (id, projecttoken, repositoryurl, lastusercommitusertoken, projecttype) FROM stdin;
5	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.umgKzVibDSJ6EsTbMPz-KHSfoiDwwj8W3JnOeV-ljsc	http://localhost:5200/api/repositories/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.umgKzVibDSJ6EsTbMPz-KHSfoiDwwj8W3JnOeV-ljsc.git	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	git
\.


--
-- Data for Name: projects_deployments; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.projects_deployments (id, projecttoken, serviceid, name, type, branch, version, deploymenturl, server, deployedat, status) FROM stdin;
\.


--
-- Data for Name: projects_task_banners; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.projects_task_banners (id, projecttoken, bannertoken, bannername, departamentassignedto, assigneeprivatetoken) FROM stdin;
1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.umgKzVibDSJ6EsTbMPz-KHSfoiDwwj8W3JnOeV-ljsc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzg5MzI1MjB9.EX25CGh_pOTVRG5nK199aWFA3L54-L4nFZyQCDFOQPc	fix the server crashing	2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M
2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.umgKzVibDSJ6EsTbMPz-KHSfoiDwwj8W3JnOeV-ljsc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mzg5NDk2MjV9.IXC-mJAx4qeLbQtuRwh-RUa3wkTlOvyVyKh8Hcqd02w	be retared	3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M
3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.umgKzVibDSJ6EsTbMPz-KHSfoiDwwj8W3JnOeV-ljsc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MzkyMjg2Mjl9.RUD_dQCfcPw7hOYH1xnxENwDg8JT1WYrrhCIAZcxcMo	test api	2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M
\.


--
-- Data for Name: projects_team_members; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.projects_team_members (id, projecttoken, userprivatetoken, roleid, divisionid) FROM stdin;
9	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.umgKzVibDSJ6EsTbMPz-KHSfoiDwwj8W3JnOeV-ljsc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	39	\N
\.


--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.resources (id, name, description) FROM stdin;
25	project	Project management resources
26	code	Source code and repositories
27	architecture	System architecture and design
28	deployment	Deployment and release management
29	security	Security-related resources
30	database	Database management and access
31	api	API management and access
32	ui	User interface components
33	test	Testing and QA resources
34	documentation	Project documentation
35	infrastructure	Infrastructure management
36	user	User management
37	role	Role management
38	analytics	Analytics and reporting
39	budget	Budget management
40	design	UI/UX design resources
41	content	Content management
42	mobile	Mobile application resources
43	ai	Artificial Intelligence resources
44	cloud	Cloud infrastructure
45	performance	Performance testing resources
46	security_test	Security testing resources
48	task_banner	Task banner management resources
49	task	Task management resources
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.role_permissions (roleid, permissionid) FROM stdin;
39	28
40	28
41	28
43	28
44	28
47	28
59	28
39	29
40	29
41	29
43	29
44	29
47	29
59	29
39	30
40	30
41	30
49	30
59	30
39	31
64	31
39	32
49	32
50	32
39	33
40	33
41	33
39	34
40	34
41	34
50	34
60	34
64	34
74	34
39	35
49	35
50	35
39	36
49	36
50	36
69	36
39	37
47	37
39	38
40	38
41	38
74	38
75	38
39	39
40	39
41	39
43	39
44	39
47	39
59	39
39	40
40	40
41	40
43	40
44	40
47	40
59	40
39	41
40	41
39	42
39	43
40	43
39	44
43	44
68	44
39	45
43	45
44	45
68	45
39	46
59	46
39	47
41	47
64	47
39	48
43	48
44	48
39	49
43	49
44	49
69	49
39	50
43	50
47	50
39	51
43	51
44	51
39	52
40	52
39	53
43	53
44	53
47	53
49	53
39	54
59	54
60	54
39	55
68	55
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.roles (id, name, description, level, category) FROM stdin;
39	PROJECT_OWNER	Has full control over the project	99	PROJECT_MANAGEMENT
40	PROJECT_MANAGER	Manages project timelines and resources	95	PROJECT_MANAGEMENT
41	PRODUCT_MANAGER	Manages product vision and roadmap	93	PROJECT_MANAGEMENT
42	PROGRAM_MANAGER	Oversees multiple related projects	94	PROJECT_MANAGEMENT
43	CHIEF_TECHNICAL_OFFICER	High-level technical executive	89	TECHNICAL_LEADERSHIP
44	TECHNICAL_ARCHITECT	Technical design and architecture	85	TECHNICAL_LEADERSHIP
45	TEAM_LEAD	Development team leadership	83	TECHNICAL_LEADERSHIP
46	TECH_LEAD	Technical decision maker	82	TECHNICAL_LEADERSHIP
47	SECURITY_ARCHITECT	Security design and architecture	84	TECHNICAL_LEADERSHIP
48	SOLUTIONS_ARCHITECT	System design and architecture	86	TECHNICAL_LEADERSHIP
49	SENIOR_DEVELOPER	Senior development and design	75	DEVELOPMENT
50	DEVELOPER	General development	70	DEVELOPMENT
51	JUNIOR_DEVELOPER	Entry-level development	65	DEVELOPMENT
52	FULL_STACK_DEVELOPER	Full-stack development	73	DEVELOPMENT
53	FRONTEND_DEVELOPER	Frontend development	70	DEVELOPMENT
54	BACKEND_DEVELOPER	Backend development	70	DEVELOPMENT
55	MOBILE_DEVELOPER	Mobile app development	70	DEVELOPMENT
56	GAME_DEVELOPER	Game development	70	DEVELOPMENT
57	AI_ENGINEER	AI/ML development	75	DEVELOPMENT
58	DATA_ENGINEER	Data pipeline development	73	DEVELOPMENT
59	QA_LEAD	QA team leadership	59	QUALITY_ASSURANCE
60	QA_ENGINEER	Quality assurance testing	55	QUALITY_ASSURANCE
61	QA_AUTOMATION	Automated testing	56	QUALITY_ASSURANCE
62	PERFORMANCE_TESTER	Performance testing	55	QUALITY_ASSURANCE
63	SECURITY_TESTER	Security testing	57	QUALITY_ASSURANCE
64	UI_DESIGNER	UI design	45	DESIGN
65	UX_DESIGNER	UX design	45	DESIGN
66	GRAPHIC_DESIGNER	Graphic design	43	DESIGN
67	CONTENT_WRITER	Content creation	42	SPECIALIZED
68	DEVOPS_ENGINEER	DevOps and infrastructure	48	SPECIALIZED
69	DATABASE_ADMIN	Database administration	47	SPECIALIZED
70	CLOUD_ENGINEER	Cloud infrastructure	47	SPECIALIZED
71	DATA_SCIENTIST	Data analysis	46	SPECIALIZED
72	CYBERSECURITY_ANALYST	Security analysis	48	SPECIALIZED
73	TECHNICAL_SUPPORT	Technical support	40	SUPPORT
74	STAKEHOLDER	Project stakeholder	19	STAKEHOLDER
75	GUEST	Limited access	10	STAKEHOLDER
76	BUSINESS_ANALYST	Business analysis	45	SPECIALIZED
\.


--
-- Data for Name: task_container_junction_table; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.task_container_junction_table (id, containeruuid, taskuuid) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: alx
--

COPY public.users (id, username, useremail, userpwd, userprivatetoken, userpublictoken, usersessiontoken, registrationtype) FROM stdin;
2	Alex Serban	alexserbwork@gmail.com	$2b$11$fC00hMUBg6U7EzpxXWBGvOt8/2oH.CgeZJvEceStY2fThF9rriboa	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk5Nzk2MDF9.LSYh_q-9MN5cmxrLLPmqU1rWyFBjcEPCLMgw1sY4YM8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk5Nzk2MDEsImV4cCI6MTczMDA2NjAwMX0.7a-Rrcyw0NdmphbqyAlcc6cQhlN8kX5uW2uJ3G2GUqA	ya29.a0AeDClZC6hHv3O-Y_7HJmkxq--5giSgyVQUOoJFnYFl-6uknd3hGoAQ9r5-Ih-0kyMK5At3zxxSWOmjzsFWzxsrUrIYKJenx0dYu62R33RArJD8eQS9QM0hI6Pdh9bnj5A1XuEhfOh6tD2VWwjwQlaoazH4BDplJiiqXDiOTnaCgYKAeoSARISFQHGX2MiJNzWgne4t7EovnBLmy4VrQ0175	google
1	Serban Alexandru	s3rbmedia@gmail.com	$2b$11$9bEW5qQ/ZtPglRjCvx3MTewRuxLNOjychHSm5oxkj9g/Ppgbyl5/W	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3Mjk4NTE1MDR9._ffACgTziZSDHELb3N2J9LwxaYdXlo6hwPD_wp2OQ5M	@5R8NLXNDR	ya29.a0AeXRPp7eKoIUdavEUoBlncloJOCXz9nr3Unh04qXtFDD-0EdY3EppHMgi6zXDEm_W32Z687V7oLGHKIDP7RkoCxFNdLDpRDbdFhDC4_9IsoEYPvOKdSAhKA9CjwgGAiGA2bu9QFCmFUu2_bBjeyIwLOXlvJpbl8lOo6Eg2phtAcaCgYKAYkSARISFQHGX2MitUQpw5ZOycfQiOZfqky1GA0178	google
3	Serban Alex	alexn.serban@gmail.com	$2b$11$5orqsgqm0PWsUCFl66Z6q.aMissk80DaIBf6hdJL.IB6hp.ah1z4O	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MzU5NDMwMDB9.tKyUaKbWoEn7lUSdeTcl1TiIlS0O7GaYu38mmq0w8Fs	@5R8NLX	ya29.a0AeXRPp6wM7zE5giHBrf_CargUqrtXnqHgLRiBE2Fo41wRZijKsKjTD2uBKXiXvZTZpZUXdLNETNglyC1564WupF9g6N1YhIufstqXLrKzVG_mf9wbM2e8aTaCG19h3XxfrXhaEobVA9gQVk-zao8_tts5p9LZItYAMJajl5j-8oaCgYKAS4SARASFQHGX2MiBIpGLhDpIYai7TbJP5XCgA0178	google
\.


--
-- Name: actions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.actions_id_seq', 24, true);


--
-- Name: active_services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.active_services_id_seq', 2, true);


--
-- Name: banner_tasks_containers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.banner_tasks_containers_id_seq', 24, true);


--
-- Name: banner_tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.banner_tasks_id_seq', 16, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.permissions_id_seq', 55, true);


--
-- Name: project_divisions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.project_divisions_id_seq', 3, true);


--
-- Name: projects_codebase_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.projects_codebase_id_seq', 5, true);


--
-- Name: projects_deployments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.projects_deployments_id_seq', 1, false);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.projects_id_seq', 5, true);


--
-- Name: projects_task_banners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.projects_task_banners_id_seq', 7, true);


--
-- Name: projects_team_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.projects_team_members_id_seq', 9, true);


--
-- Name: resources_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.resources_id_seq', 49, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.roles_id_seq', 76, true);


--
-- Name: task_container_junction_table_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.task_container_junction_table_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alx
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: actions actions_name_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_name_key UNIQUE (name);


--
-- Name: actions actions_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.actions
    ADD CONSTRAINT actions_pkey PRIMARY KEY (id);


--
-- Name: active_services active_services_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.active_services
    ADD CONSTRAINT active_services_pkey PRIMARY KEY (id);


--
-- Name: active_services active_services_service_token_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.active_services
    ADD CONSTRAINT active_services_service_token_key UNIQUE (service_token);


--
-- Name: banner_tasks_containers banner_tasks_containers_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.banner_tasks_containers
    ADD CONSTRAINT banner_tasks_containers_pkey PRIMARY KEY (id);


--
-- Name: banner_tasks banner_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.banner_tasks
    ADD CONSTRAINT banner_tasks_pkey PRIMARY KEY (id);


--
-- Name: banner_tasks banner_tasks_taskuuid_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.banner_tasks
    ADD CONSTRAINT banner_tasks_taskuuid_key UNIQUE (taskuuid);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: project_divisions project_divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.project_divisions
    ADD CONSTRAINT project_divisions_pkey PRIMARY KEY (id);


--
-- Name: project_divisions project_divisions_projecttoken_divisionname_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.project_divisions
    ADD CONSTRAINT project_divisions_projecttoken_divisionname_key UNIQUE (projecttoken, divisionname);


--
-- Name: projects_codebase projects_codebase_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_codebase
    ADD CONSTRAINT projects_codebase_pkey PRIMARY KEY (id);


--
-- Name: projects_codebase projects_codebase_projecttoken_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_codebase
    ADD CONSTRAINT projects_codebase_projecttoken_key UNIQUE (projecttoken);


--
-- Name: projects_deployments projects_deployments_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_deployments
    ADD CONSTRAINT projects_deployments_pkey PRIMARY KEY (id);


--
-- Name: projects_deployments projects_deployments_projecttoken_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_deployments
    ADD CONSTRAINT projects_deployments_projecttoken_key UNIQUE (projecttoken);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_projecttoken_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_projecttoken_key UNIQUE (projecttoken);


--
-- Name: projects_task_banners projects_task_banners_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_task_banners
    ADD CONSTRAINT projects_task_banners_pkey PRIMARY KEY (id);


--
-- Name: projects_team_members projects_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_team_members
    ADD CONSTRAINT projects_team_members_pkey PRIMARY KEY (id);


--
-- Name: projects_team_members projects_team_members_projecttoken_userprivatetoken_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_team_members
    ADD CONSTRAINT projects_team_members_projecttoken_userprivatetoken_key UNIQUE (projecttoken, userprivatetoken);


--
-- Name: resources resources_name_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_name_key UNIQUE (name);


--
-- Name: resources resources_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.resources
    ADD CONSTRAINT resources_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (roleid, permissionid);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: task_container_junction_table task_container_junction_table_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.task_container_junction_table
    ADD CONSTRAINT task_container_junction_table_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_userprivatetoken_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_userprivatetoken_key UNIQUE (userprivatetoken);


--
-- Name: users users_userpublictoken_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_userpublictoken_key UNIQUE (userpublictoken);


--
-- Name: users users_usersessiontoken_key; Type: CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_usersessiontoken_key UNIQUE (usersessiontoken);


--
-- Name: idx_container_order; Type: INDEX; Schema: public; Owner: alx
--

CREATE INDEX idx_container_order ON public.banner_tasks_containers USING btree (bannertoken, containerorder);


--
-- Name: permissions permissions_actionid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_actionid_fkey FOREIGN KEY (actionid) REFERENCES public.actions(id);


--
-- Name: permissions permissions_resourceid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_resourceid_fkey FOREIGN KEY (resourceid) REFERENCES public.resources(id);


--
-- Name: projects_team_members projects_team_members_divisionid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_team_members
    ADD CONSTRAINT projects_team_members_divisionid_fkey FOREIGN KEY (divisionid) REFERENCES public.project_divisions(id);


--
-- Name: projects_team_members projects_team_members_roleid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_team_members
    ADD CONSTRAINT projects_team_members_roleid_fkey FOREIGN KEY (roleid) REFERENCES public.roles(id);


--
-- Name: projects_team_members projects_team_members_userprivatetoken_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.projects_team_members
    ADD CONSTRAINT projects_team_members_userprivatetoken_fkey FOREIGN KEY (userprivatetoken) REFERENCES public.users(userprivatetoken);


--
-- Name: role_permissions role_permissions_permissionid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permissionid_fkey FOREIGN KEY (permissionid) REFERENCES public.permissions(id);


--
-- Name: role_permissions role_permissions_roleid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alx
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_roleid_fkey FOREIGN KEY (roleid) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

--
-- Database "postgres" dump
--

\connect postgres

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.0
-- Dumped by pg_dump version 16.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

--
-- PostgreSQL database cluster dump complete
--

