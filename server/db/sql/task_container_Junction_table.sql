DROP TABLE IF EXISTS task_container_Junction_table;
CREATE TABLE task_container_Junction_table (
    id SERIAL PRIMARY KEY,
    ContainerUUID VARCHAR(250) NOT NULL,
    TaskUUID VARCHAR(250) NOT NULL
    );