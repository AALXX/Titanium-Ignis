CREATE TABLE Chats (
    id UUID PRIMARY KEY,
    chatToken TEXT,
    person1_token TEXT,
    person2_token TEXT
);

CREATE INDEX ON Chats (chatToken);
CREATE INDEX ON Chats ();

CREATE MATERIALIZED VIEW Chats_by_chatToken AS
        SELECT id, chatToken, athlete_public_token, trainer_public_token
        FROM Chats
        WHERE chatToken IS NOT NULL AND id IS NOT NULL
        PRIMARY KEY (chatToken, id);