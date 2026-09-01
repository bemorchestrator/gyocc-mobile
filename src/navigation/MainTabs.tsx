import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import FloatingTabBar from "./FloatingTabBar";
import {
  ClockScreen,
  EarningsScreen,
  InboxScreen,
  PortalHomeScreen,
  ProfileScreen,
  ScheduleScreen,
} from "../screens/PortalDesignScreens";
import ScholarshipScreen, {
  ScholarshipAbsenceFormScreen,
  ScholarshipAbsencesScreen,
  ScholarshipApplicationScreen,
  ScholarshipAttendancePlanScreen,
  ScholarshipAwardsScreen,
  ScholarshipDocumentsScreen,
  ScholarshipEligibilityScreen,
  ScholarshipPerformanceScreen,
} from "../screens/ScholarshipScreen";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={PortalHomeScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Clock" component={ClockScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Member" component={ScholarshipScreen} options={{ tabBarLabel: "Scholarship" }} />
      <Tab.Screen name="ScholarshipEligibility" component={ScholarshipEligibilityScreen} />
      <Tab.Screen name="ScholarshipApplication" component={ScholarshipApplicationScreen} />
      <Tab.Screen name="ScholarshipDocuments" component={ScholarshipDocumentsScreen} />
      <Tab.Screen name="ScholarshipAttendancePlan" component={ScholarshipAttendancePlanScreen} />
      <Tab.Screen name="ScholarshipPerformance" component={ScholarshipPerformanceScreen} />
      <Tab.Screen name="ScholarshipAbsences" component={ScholarshipAbsencesScreen} />
      <Tab.Screen name="ScholarshipAbsenceForm" component={ScholarshipAbsenceFormScreen} />
      <Tab.Screen name="ScholarshipAwards" component={ScholarshipAwardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: "Account" }} />
      <Tab.Screen name="Inbox" component={InboxScreen} />
    </Tab.Navigator>
  );
}
