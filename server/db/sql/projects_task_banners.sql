DROP TABLE IF EXISTS projects_task_banners;

CREATE TABLE
    projects_task_banners (
        id SERIAL PRIMARY KEY,
        ProjectToken VARCHAR(250) NOT NULL,
        BannerToken VARCHAR(250) NOT NULL,
        BannerName VARCHAR(250) NOT NULL,
        DepartamentAssignedTo INT NOT NULL,
        AssigneePrivateToken VARCHAR(250) NOT NULL
    );