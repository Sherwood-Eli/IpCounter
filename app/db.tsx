import {openDatabaseSync, SQLiteDatabase} from 'expo-sqlite';

export type IPdata = {ip: string, date: string, change_type: number};
export type Stat = {num_pchecks: number, num_echecks: number, num_echanges: number, num_pchanges: number}

//TODO db.execAsync does not protect against sql injections

function errorCall(err: string) {
    console.log("SQL error: " + err);
  }
  
function successCall(spec: string) {
console.log("SQL executed fine: "+spec);
}

export const getDBConnection = () => {
  return openDatabaseSync('ip_storage');
};

export const createTables = (db: SQLiteDatabase) => {
    db.runSync(
      `CREATE TABLE IF NOT EXISTS ips (
        ip TEXT,
        date TEXT,
        change_type INTEGER
      )`
    );
    db.runSync(
      `CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY,
        num_pchecks INTEGER,
        num_echecks INTEGER,
        num_pchanges INTEGER,
        num_echanges INTEGER
      )`
    );
  }

export const getIps = (db: SQLiteDatabase) => {
  //get data and ip addresses
  const getIps = 'SELECT * from ips';
  
  try {
    const ips = db.getAllSync(getIps);
    return ips;
  } catch (error) {
    console.error(error);
    throw Error("Failed to get ips");
  }
}

export const getStats = (db: SQLiteDatabase) => {
  const getStats = 'SELECT * from stats WHERE id = 1';
  try {
    let stats: Stat = db.getFirstSync(getStats) as Stat;
    if (stats == null) {
      stats = {num_pchecks: 0, num_echecks: 0, num_echanges: 0, num_pchanges: 0} 
      saveStats(db, stats);
    }
    return stats;
  } catch (error) {
    console.error(error);
    throw Error("Failed to get stats");
  }
}

export const insertIp = (db: SQLiteDatabase, ipData: IPdata) => {
  const insertIps = 'INSERT INTO ips (ip, date, change_type) VALUES (?, ?, ?)';
  try {
    db.runSync(insertIps, ipData.ip, ipData.date, ipData.change_type);
  } catch (error) {
    console.error(error);
    throw Error("Failed to insert ip");
  }
}

export const saveStats = (db: SQLiteDatabase, stats: Stat) => {
  const saveStats =  `
    INSERT OR REPLACE INTO stats (id, num_pchecks, num_echecks, num_pchanges, num_echanges)
    VALUES (1, ?, ?, ?, ?)
  `;
  try {
    db.runSync(saveStats, stats.num_pchecks, stats.num_echanges, stats.num_pchanges, stats.num_echanges);
  } catch (error) {
    console.error(error);
    throw Error("Failed to save stats");
  }
}

export const dropTable = (db: SQLiteDatabase, table: string) => {
  const dropTable = 'DROP TABLE ' + table;

  try {
    db.runSync(dropTable);
  } catch (error) {
    console.error(error);
    throw Error("Failed to save stats");
  }
}