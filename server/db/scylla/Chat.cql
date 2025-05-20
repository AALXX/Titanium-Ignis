DROP TABLE IF EXISTS Conversations;

CREATE TABLE Conversations (
    id UUID PRIMARY KEY,
    chatToken TEXT,
    person1_token TEXT,
    person2_token TEXT
);

CREATE INDEX IF NOT EXISTS ON Conversations (chatToken);

CREATE MATERIALIZED VIEW IF NOT EXISTS Conversations_by_person1_token AS
  SELECT id, chatToken, person1_token, person2_token
  FROM Conversations
  WHERE person1_token IS NOT NULL AND id IS NOT NULL
  PRIMARY KEY (person1_token, id);

CREATE MATERIALIZED VIEW IF NOT EXISTS Conversations_by_person2_token AS
  SELECT id, chatToken, person1_token, person2_token
  FROM Conversations
  WHERE person2_token IS NOT NULL AND id IS NOT NULL
  PRIMARY KEY (person2_token, id);
