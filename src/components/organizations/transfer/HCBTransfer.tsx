import { Picker } from '@react-native-picker/picker';
import { useTheme } from '@react-navigation/native';
import { useContext, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import useSWR from 'swr';

import AuthContext from '../../../auth';
import { OrganizationExpanded } from '../../../lib/types/Organization';
import { palette } from '../../../theme';
import { renderMoney } from '../../../util';

type HCBTransferScreenProps = {
  organization: OrganizationExpanded;
};
  
const HCBTransferScreen = ({ organization }: HCBTransferScreenProps) => {
  const [amount, setAmount] = useState('$0.00');
  const [chosenOrg, setOrganization] = useState('');
  const { colors: themeColors } = useTheme();
  const { data: organizations } = useSWR<OrganizationExpanded[]>('user/organizations');
  const { token } = useContext(AuthContext);

  console.log(token)
  const handleTransfer = async () => {
    console.log(chosenOrg)
    console.log(organization.id)
    const response = await fetch(`https://hcb.hackclub.com/api/v4/organizations/org_dku3wo/transfers`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer hcb_T8OBkVIsd0MzaGxPgfebcwP0X6c5h_Xm4PC13uTaToo`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            event_id: "org_dku3wo",
            to_organization_id: "org_9rud56",
            // amount in cents ,
            amount_cents: 500,
            //Number(amount.replace('$', '')) * 100,
            name: "org_dku3wo"
        }),
    })
    console.log(response.status)
    console.log(await response.text());
  };

  useEffect(() => {
    if (chosenOrg === '') {
      setAmount('$0.00');
    }
  }, [chosenOrg]);

  if (!organizations) {
    return <View
        style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        }}
    >
        <ActivityIndicator size="large" color={themeColors.primary} />
    </View>;
  }

  return (
    <View>
      {/* From Section */}
      <Text style={{ color: themeColors.text, fontSize: 18, marginVertical: 12, fontWeight: 'bold' }}>
        From
      </Text>
      <View
        style={{
          backgroundColor: themeColors.card,
          borderRadius: 8,
          padding: 15,
          marginBottom: 15,
        }}
      >
        <Text style={{ color: themeColors.text, fontSize: 16 }}>
          {organization.name} ({renderMoney(organization.balance_cents)})
        </Text>
      </View>

      {/* To Section */}
      <Text style={{ color: themeColors.text, fontSize: 18, marginVertical: 12, fontWeight: 'bold' }}>
        To
      </Text>
      <View
        style={{
          backgroundColor: themeColors.card,
          borderRadius: 8,
          marginBottom: 15,
        }}
      >
        <Picker
          selectedValue={chosenOrg}
          onValueChange={(itemValue) => setOrganization(itemValue)}
          style={{ color: themeColors.text }}
          dropdownIconColor={themeColors.text}
        >
          <Picker.Item label="Select one..." value="" />
          {organizations.map((org) => (
            <Picker.Item key={org.id} label={org.name} value={org.id} />
          ))}
        </Picker>
      </View>
      <Text style={{ color: palette.muted, fontSize: 14, marginBottom: 20 }}>
        You can transfer to any organization you're a part of.
      </Text>

      {/* Amount Section */}
      <Text style={{ color: themeColors.text, fontSize: 18, marginVertical: 12, fontWeight: 'bold' }}>
        Amount
      </Text>
      <TextInput
        style={{
          backgroundColor: themeColors.card,
          color: themeColors.text,
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          marginBottom: 15,
        }}
        value={amount}
        onChangeText={(text) => {
          if (text === '') {
            setAmount('$0.00');
          } else {
            setAmount(`$${text.replace('$', '')}`);
          }
        }}
        placeholder="$0.00"
        placeholderTextColor={themeColors.text}
        keyboardType="numeric"
      />

      {/* Purpose Section */}
      <Text style={{ color: themeColors.text, fontSize: 18, marginVertical: 12, fontWeight: 'bold' }}>
        What is the transfer for?
      </Text>
      <TextInput
        style={{
          backgroundColor: themeColors.card,
          color: themeColors.text,
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          marginBottom: 10,
        }}
        value={organization.name} // or change this to the desired value
        onChangeText={(text) => setOrganization({ ...organization, name: text })} // or another suitable update
        placeholder="Donating extra funds to another organization"
        placeholderTextColor={palette.muted}
      />
      <Text style={{ color: palette.muted, fontSize: 14, marginBottom: 20 }}>
        This is to help HCB keep record of our transactions.
      </Text>

      {/* Transfer Button */}
      <TouchableOpacity
        style={{
          backgroundColor: themeColors.primary,
          padding: 15,
          borderRadius: 8,
          marginTop: 20,
          alignItems: 'center',
        }}
        onPress={handleTransfer}
      >
        <Text
          style={{
            color: themeColors.text,
            fontSize: 16,
            fontWeight: 'bold',
          }}
        >
          Make Transfer
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default HCBTransferScreen;
