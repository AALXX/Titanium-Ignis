DROP TABLE IF EXISTS banner_tasks_containers;

CREATE TABLE
    banner_tasks_containers (
        id SERIAL PRIMARY KEY,
        BannerToken VARCHAR(250) NOT NULL,
        ContainerName VARCHAR(250) NOT NULL,
        ContainerUUID VARCHAR(250) NOT NULL
    );