CREATE KEYSPACE IF NOT EXISTS trainerz_platform WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 2};
USE TI_platform;