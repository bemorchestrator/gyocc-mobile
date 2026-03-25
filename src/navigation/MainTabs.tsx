import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import FloatingTabBar from "./FloatingTabBar";
import HomeScreen from "../screens/HomeScreen";
import GigListScreen from "../screens/GigListScreen";
import GigDetailScreen from "../screens/GigDetailScreen";
import AddEditGigScreen from "../screens/AddEditGigScreen";
import EquipmentListScreen from "../screens/EquipmentListScreen";
import EquipmentDetailScreen from "../screens/EquipmentDetailScreen";
import AddEditEquipmentScreen from "../screens/AddEditEquipmentScreen";
import LoanListScreen from "../screens/LoanListScreen";
import CreateLoanScreen from "../screens/CreateLoanScreen";
import ReturnLoanScreen from "../screens/ReturnLoanScreen";
import ProfileScreen from "../screens/ProfileScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import GigTypesScreen from "../screens/GigTypesScreen";
import PayoutRatesScreen from "../screens/PayoutRatesScreen";

const Tab = createBottomTabNavigator();
const GigStackNav = createNativeStackNavigator();
const ProfileStackNav = createNativeStackNavigator();

function ProfileStackScreen() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="ProfileMain"   component={ProfileScreen} />
      <ProfileStackNav.Screen name="EditProfile"   component={EditProfileScreen} />
      <ProfileStackNav.Screen name="GigTypes"      component={GigTypesScreen} />
      <ProfileStackNav.Screen name="PayoutRates"   component={PayoutRatesScreen} />
    </ProfileStackNav.Navigator>
  );
}
const EquipmentStackNav = createNativeStackNavigator();
const LoanStackNav = createNativeStackNavigator();

function GigStackScreen() {
  return (
    <GigStackNav.Navigator screenOptions={{ headerShown: false }}>
      <GigStackNav.Screen name="GigList"    component={GigListScreen} />
      <GigStackNav.Screen name="GigDetail"  component={GigDetailScreen} />
      <GigStackNav.Screen name="AddEditGig" component={AddEditGigScreen} />
    </GigStackNav.Navigator>
  );
}

function EquipmentStackScreen() {
  return (
    <EquipmentStackNav.Navigator screenOptions={{ headerShown: false }}>
      <EquipmentStackNav.Screen name="EquipmentList"    component={EquipmentListScreen} />
      <EquipmentStackNav.Screen name="EquipmentDetail"  component={EquipmentDetailScreen} />
      <EquipmentStackNav.Screen name="AddEditEquipment" component={AddEditEquipmentScreen} />
    </EquipmentStackNav.Navigator>
  );
}

function LoanStackScreen() {
  return (
    <LoanStackNav.Navigator screenOptions={{ headerShown: false }}>
      <LoanStackNav.Screen name="LoanList"   component={LoanListScreen} />
      <LoanStackNav.Screen name="CreateLoan" component={CreateLoanScreen} />
      <LoanStackNav.Screen name="ReturnLoan" component={ReturnLoanScreen} />
    </LoanStackNav.Navigator>
  );
}


export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"      component={HomeScreen} />
      <Tab.Screen name="Gigs"      component={GigStackScreen} />
      <Tab.Screen name="Equipment" component={EquipmentStackScreen} />
      <Tab.Screen name="Loans"     component={LoanStackScreen} />
      <Tab.Screen name="Profile"   component={ProfileStackScreen} />
    </Tab.Navigator>
  );
}
