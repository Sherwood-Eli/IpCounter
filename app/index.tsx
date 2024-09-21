import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { NetworkInfo } from 'react-native-network-info';
import moment from 'moment';

import { getDBConnection, createTables, getStats, getIps, insertIp, saveStats, dropTable, Stat, IPdata} from './db';

const p = 0;
const e = 1;



const styles = StyleSheet.create({
  stat: {
    textAlign: 'center'
  },
  stats: {
    backgroundColor: '#fae0b7',
    marginTop: 40,
    marginHorizontal: 10,
    padding:10,
    justifyContent: 'center',
    borderRadius: 25
  },
  ip: {
    backgroundColor: '#94c7eb',
    borderRadius: 15,
    padding:10,
    marginBottom:10
  }
});

const IP = (data: IPdata) => (
  <View style={styles.ip}>
    <Text style={{fontSize:32}}>{data.ip}</Text>
    <Text>{data.date}</Text>
    <Text style={{textAlign:'center', marginTop:5, fontWeight:'bold'}}>Change detected by: {data.change_type==p ? "periodic" : "event-driven"} check</Text>
  </View>
);

//initialize some variables
//intitialize db
const db = getDBConnection();
//dropTable(db, "ips");
createTables(db);

const stats: Stat = getStats(db) as Stat;  
const ips: Array<IPdata> = getIps(db) as Array<IPdata>;

/* logs all ip addresses
ips.forEach((row: any) => {
  console.log(row.ip, row.date);
}
)

console.log(ips);
console.log(stats);
*/

let ipAddress: string | null = null;
if (ips.length != 0) {
  ipAddress = ips[ips.length-1].ip;
}


export default function Index() {
  const [pChecks, setNumPchecks] = useState(stats.num_pchecks);
  const [eChecks, setNumEchecks] = useState(stats.num_echecks);
  const [pChanges, setNumPchanges] = useState(stats.num_pchanges);
  const [eChanges, setNumEchanges] = useState(stats.num_echanges);


  useEffect(() => {
    // Monitor network status and IP address changes
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        setNumEchecks(++stats.num_echecks);
        checkIPAddressChange(e);
      }
    });

    // Optional: Check IP address periodically (e.g., every 10 seconds)
    const intervalId = setInterval(() => {
      setNumPchecks(++stats.num_pchecks);
      checkIPAddressChange(p);
    }, 10000); // 10,000ms = 10 seconds

    // Clean up
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const checkIPAddressChange = async (check_type: number) => {
    const currentIp = await NetworkInfo.getIPV4Address();

    if (currentIp !== ipAddress) {
      let previousIpAddress = ipAddress;
      ipAddress = currentIp;

      const date = moment().utcOffset('08:00').format('YYYY-MM-DD hh:mm:ss a');
      console.log(`IP Address changed from ${previousIpAddress} to ${ipAddress} with ${stats.num_pchecks+stats.num_echecks} checks`);

      let newIp: IPdata = {ip: ipAddress as string, date: date, change_type: check_type == p ? p : e}
      insertIp(db, newIp);
      ips.push(newIp);

      if (check_type == p) {
        setNumPchanges(++stats.num_pchanges);
      } else {
        setNumEchanges(++stats.num_echanges);
      }

    } else {
      console.log('IP Address has not changed. ' + (stats.num_pchecks+stats.num_echecks));
    }
    saveStats(db, stats);
  };

  return (
    <View>
      <View style={styles.stats}>
        <Text style={styles.stat}>Number of periodic checks: {pChecks}</Text>
        <Text style={styles.stat}>Number of event-driven checks: {eChecks}</Text>
        <Text style={styles.stat}>Number of periodic changes: {pChanges}</Text>
        <Text style={styles.stat}>Number of event-driven changes: {eChanges}</Text>
        <Text style={[styles.stat, {margin:5, backgroundColor:'#c6cd55', fontSize: 25}]}>Current IP: {ipAddress}</Text>
      </View>
      <View style={[styles.stats, {marginTop: 20}]}>
        <Text style={{fontSize:20, textAlign:'center', marginBottom: 10}}>IP History:</Text>
        <FlatList
          data={ips}
          renderItem={({item}) => <IP ip={item.ip} date={item.date} change_type={item.change_type}/>}
          keyExtractor={item => item.date}
        />
      </View>
    </View>
  );
}

