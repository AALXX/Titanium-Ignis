DROP TABLE IF EXISTS Messages;

CREATE TABLE Messages (
    id UUID PRIMARY KEY,
    chatToken TEXT,
    senderPublicToken TEXT,
    content TEXT,
    attachments LIST<FROZEN<MAP<TEXT, TEXT>>>,
    timeSent TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ON Messages (chatToken);

CREATE MATERIALIZED VIEW IF NOT EXISTS Messages_by_chatToken AS
  SELECT id, chatToken, senderPublicToken, content, attachments, timeSent
  FROM Messages
  WHERE chatToken IS NOT NULL AND id IS NOT NULL
  PRIMARY KEY (chatToken, id);

CREATE MATERIALIZED VIEW IF NOT EXISTS Messages_by_senderPublicToken AS
  SELECT id, chatToken, senderPublicToken, content, attachments, timeSent
  FROM Messages
  WHERE senderPublicToken IS NOT NULL AND id IS NOT NULL
  PRIMARY KEY (senderPublicToken, id);
