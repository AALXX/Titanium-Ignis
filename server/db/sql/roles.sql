CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    Name VARCHAR(50) NOT NULL UNIQUE,
    Description TEXT,
    Level INTEGER NOT NULL,
    Category VARCHAR(30) NOT NULL CHECK (
        Category IN (
            'PROJECT_MANAGEMENT',
            'TECHNICAL_LEADERSHIP',
            'DEVELOPMENT',
            'QUALITY_ASSURANCE',
            'SPECIALIZED',
            'STAKEHOLDER',
            'DESIGN',
            'SUPPORT'
        )
    )
);