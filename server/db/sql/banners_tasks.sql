DROP TABLE IF EXISTS banners_tasks;

CREATE TABLE
    banners_tasks (
        id SERIAL PRIMARY KEY,
        BannerToken VARCHAR(250) NOT NULL,
        TaskName VARCHAR(250) NOT NULL,
        TaskDescription VARCHAR(250) NOT NULL,
        AssignedMemberPrivateToken VARCHAR(250) NOT NULL,
    )