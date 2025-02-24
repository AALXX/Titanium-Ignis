DROP TABLE IF EXISTS banner_tasks;

CREATE TABLE
    banner_tasks (
        id SERIAL PRIMARY KEY,
        TaskUUID VARCHAR(250) NOT NULL,
        ContainerUUID VARCHAR(250) NOT NULL,
        TaskName VARCHAR(250) NOT NULL,
        TaskDescription VARCHAR(250),
        AssignedMemberPrivateToken VARCHAR(250),
        TaskStatus VARCHAR(250) NOT NULL,
        TaskDueDate DATE NOT NULL,
        TaskImportance VARCHAR(250) NOT NULL
    );