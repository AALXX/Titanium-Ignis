    DROP TABLE IF EXISTS banner_tasks_containers;

    CREATE TABLE
        banner_tasks_containers (
            id SERIAL PRIMARY KEY,
            BannerToken VARCHAR(250) NOT NULL,
            ContainerName VARCHAR(250) NOT NULL,
            ContainerUUID VARCHAR(250) NOT NULL,
            ContainerOrder INTEGER NOT NULL DEFAULT 0
        );

    CREATE INDEX idx_container_order ON banner_tasks_containers(BannerToken, ContainerOrder);
