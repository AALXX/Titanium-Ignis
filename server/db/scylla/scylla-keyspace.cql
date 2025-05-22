CREATE KEYSPACE IF NOT EXISTS ti_platform 
WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 3} 
AND tablets = {'enabled': false};

USE ti_platform;