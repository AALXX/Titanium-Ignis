DROP TABLE IF EXISTS active_services;

CREATE TABLE active_services (
    id SERIAL PRIMARY KEY,
    project_token TEXT NOT NULL,
    service_token TEXT NOT NULL,
    service_name TEXT NOT NULL,
    service_id INT NOT NULL,
    service_status TEXT NOT NULL,
    UNIQUE (service_token)
);

