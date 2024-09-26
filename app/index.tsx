import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
// DOWE need both of these network packages?
import NetInfo from '@react-native-community/netinfo';
import { NetworkInfo } from 'react-native-network-info';
import moment from 'moment';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import {EventRegister} from 'react-native-event-listeners';

import { getDBConnection, createTables, getStats, getIps, insertIp, saveStats, dropTable, Stat, IPdata} from './db';

// constants for knowing if something is periodic or event driven
const P = 0;
const E = 1;

//create style sheets for view styling
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

//defintion of an IP component for ip history view
const IP = (data: IPdata) => (
  <View style={styles.ip}>
    <Text style={{fontSize:32}}>{data.ip}</Text>
    <Text>{data.date}</Text>
    <Text style={{textAlign:'center', marginTop:5, fontWeight:'bold'}}>Change detected by: {data.change_type==P ? "periodic" : "event-driven"} check</Text>
  </View>
);

//intitialize db
const db = getDBConnection();
//dropTable(db, "ips");
//dropTable(db, "stats");

createTables(db);

const stats: Stat = getStats(db) as Stat;  
const ips: Array<IPdata> = (getIps(db) as Array<IPdata>).reverse();

let ipAddress: string | null = null;
if (ips.length != 0) {
  ipAddress = ips[0].ip;
}

//set up background fetch
const IP_BACKGROUND_FETCH= 'background-fetch';

TaskManager.defineTask(IP_BACKGROUND_FETCH, async () => {
  console.log("background fetch active");
  stats.num_pchecks++;
  await checkIPAddressChange(P);

  EventRegister.emit("background_execution", stats);
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

function registerBackgroundFetch() {
  return BackgroundFetch.registerTaskAsync(IP_BACKGROUND_FETCH, {
    minimumInterval: 60 * 10, // 10 minutes
    stopOnTerminate: false, // android only,
    startOnBoot: true, // android only
  });
}

registerBackgroundFetch();

// function for checking if ip address changed
const checkIPAddressChange = async (check_type: number) => {
  const currentIp = await NetworkInfo.getIPV4Address();

  if (currentIp !== ipAddress) {
    //let previousIpAddress = ipAddress;
    ipAddress = currentIp;


    const date = moment().utcOffset('08:00').format('YYYY-MM-DD hh:mm:ss a');
    //console.log(`IP Address changed from ${previousIpAddress} to ${ipAddress} with ${stats.num_pchecks+stats.num_echecks} checks`);

    let newIp: IPdata = {ip: ipAddress as string, date: date, change_type: check_type}
    insertIp(db, newIp);
    ips.unshift(newIp);

    if (check_type == P) {
      stats.num_pchanges++;
    } else {
      stats.num_echanges++;
    }

  }
  console.log("saving stats");
  saveStats(db, stats);
};


export default function Index() { 
  const [pChecks, setNumPchecks] = useState(stats.num_pchecks);
  const [eChecks, setNumEchecks] = useState(stats.num_echecks);
  const [pChanges, setNumPchanges] = useState(stats.num_pchanges);
  const [eChanges, setNumEchanges] = useState(stats.num_echanges);

  useEffect(() => {
    // Recieves updates from background if background execution happens
    const eventListener: string | boolean = EventRegister.addEventListener('background_execution', (stats: Stat) => {
      setNumPchanges(stats.num_pchanges);
      setNumPchecks(stats.num_pchecks);
    });
    
    // Monitor network status and IP address changes
    const unsubscribe = NetInfo.addEventListener(async state => {
      if (state.isConnected) {
        console.log("network event");
        await checkIPAddressChange(E);
        setNumEchecks(++stats.num_echecks);
      }
    });
    return() => {
      EventRegister.removeEventListener(eventListener as string);
      unsubscribe();
    }
  }, );

  return (
    <View style={{flex:1}}>
      <View style={styles.stats}>
        <Text style={styles.stat}>Number of periodic checks: {pChecks}</Text>
        <Text style={styles.stat}>Number of event-driven checks: {eChecks}</Text>
        <Text style={styles.stat}>Number of periodic changes: {pChanges}</Text>
        <Text style={styles.stat}>Number of event-driven changes: {eChanges}</Text>
        <Text style={[styles.stat, {margin:5, backgroundColor:'#c6cd55', fontSize: 25}]}>Current IP: {ipAddress}</Text>
      </View>
      <View style={[styles.stats, {marginVertical: 20, flexShrink:1}]}>
        <Text style={{fontSize:20, textAlign:'center', marginBottom: 10}}>IP History:</Text>
        <FlatList
          data={ips}
          renderItem={({item}) => <IP ip={item.ip} date={item.date} change_type={item.change_type}/>}
          keyExtractor={item => item.date}
          style={{borderRadius:15}}
        />
      </View>
    </View>
  );
}

