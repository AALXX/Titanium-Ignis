DROP TABLE IF EXISTS banner_tasks;

CREATE TABLE
    banner_tasks (
        id SERIAL PRIMARY KEY,
        TaskUUID VARCHAR(250) NOT NULL UNIQUE,
        ContainerUUID VARCHAR(250) NOT NULL,
        TaskName VARCHAR(250) NOT NULL,
        TaskDescription TEXT,
        AssignedMemberPrivateToken VARCHAR(250),
        CreatedByUserPrivateToken VARCHAR(250) NOT NULL,
        TaskStatus VARCHAR(50) NOT NULL,
        TaskImportance VARCHAR(50) NOT NULL,
        TaskCreatedDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        TaskDueDate TIMESTAMP WITH TIME ZONE NOT NULL,
        TaskCompletedDate TIMESTAMP WITH TIME ZONE,
        TaskEstimatedHours DECIMAL(5,2),
        TaskActualHours DECIMAL(5,2),
        TaskLabels TEXT[],
        TaskAttachmentsCount INTEGER DEFAULT 0,
        TaskCommentsCount INTEGER DEFAULT 0,
        TaskReminderDate TIMESTAMP WITH TIME ZONE,
        TaskIsArchived BOOLEAN DEFAULT FALSE,
        TaskLastUpdated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        IsComplete BOOLEAN,
        TaskLastUpdatedBy VARCHAR(250),
        TaskDependencies TEXT[],
        TaskCustomFields JSONB,
    );