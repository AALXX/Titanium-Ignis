DROP TABLE IF EXISTS deployment_data_centers;

CREATE TABLE deployment_data_centers (
        id SERIAL PRIMARY KEY,
        DataCenterLocation VARCHAR(50) NOT NULL
);
