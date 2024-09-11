import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { NetworkInfo } from 'react-native-network-info';

export default function Index() {
  let ipAddress = null;
  let previousIpAddress = null;
  const [ipAddressD, setIpAddress] = useState<string | null>(null);
  const [previousIpAddressD, setPreviousIpAddress] = useState<string | null>(null);

  let numPchecks = 0;
  let numEchecks = 0;
  const [pChecks, setNumPchecks] = useState(numPchecks);
  const [eChecks, setNumEchecks] = useState(numEchecks);


  useEffect(() => {
    // Monitor network status and IP address changes
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        setNumEchecks(++numEchecks);
        checkIPAddressChange();
      }
    });

    // Optional: Check IP address periodically (e.g., every 10 seconds)
    const intervalId = setInterval(() => {
      setNumPchecks(++numPchecks);
      checkIPAddressChange();
    }, 10000); // 10,000ms = 10 seconds

    // Clean up
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const checkIPAddressChange = async () => {
    const currentIp = await NetworkInfo.getIPV4Address();

    if (currentIp !== ipAddress) {
      previousIpAddress = ipAddress;
      ipAddress = currentIp;
      console.log(`IP Address changed from ${previousIpAddress} to ${ipAddress} with ${numPchecks+numEchecks} checks`);
      setPreviousIpAddress(previousIpAddress);
      setIpAddress(ipAddress);

      // Trigger your desired action here (e.g., API call, UI update)
    } else {
      console.log('IP Address has not changed. ' + numPchecks);
    }
  };

  return (
    <View>
      <Text>Current IP: {ipAddressD}</Text>
      <Text>Previous IP: {previousIpAddressD}</Text>
      <Text>Number of periodic checks: {pChecks}</Text>
      <Text>Number of event-driven checks: {eChecks}</Text>
    </View>
  );
}
