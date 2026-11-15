import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OverviewScreen from "../screens/member/OverviewScreen";
import WeekScreen from "../screens/member/WeekScreen";
import SeasonScreen from "../screens/member/SeasonScreen";
import MonthScreen from "../screens/member/MonthScreen";
import DayScreen from "../screens/member/DayScreen";
import CallScreen from "../screens/member/CallScreen";
import ClockInScreen from "../screens/member/ClockInScreen";
import AttendanceScreen from "../screens/member/AttendanceScreen";
import AccountScreen from "../screens/member/AccountScreen";
import MenuScreen from "../screens/member/MenuScreen";
import DeleteAccountScreen from "../screens/member/DeleteAccountScreen";
import { InboxScreen } from "../screens/PortalDesignScreens";

// Member app (design/mockups/board-*.png): no tab bar. Home is the analytics
// overview (board-3); its calendar icon opens the "This Week" list, the ring opens
// My Season and its calendar icon opens This Month. The square button opens
// Clock, and the menu icon opens the dark Menu.
//
// Route names "Schedule", "Clock", "Profile", "Inbox" and "Home" are kept from
// the previous tab layout so the Inbox's deep links keep working.
//
// Earnings/stipends (EarningsScreen), Scholarship (ScholarshipScreen +
// screens/scholarship/*) and Notation (NotationScreen) are intentionally not
// registered for now; their screen files are kept so they can be re-added.
const Stack = createNativeStackNavigator();

export default function MainTabs() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="Home" component={OverviewScreen} />
      <Stack.Screen name="Week" component={WeekScreen} />
      <Stack.Screen name="Season" component={SeasonScreen} />
      <Stack.Screen name="Month" component={MonthScreen} />
      <Stack.Screen name="Schedule" component={DayScreen} />
      <Stack.Screen name="Call" component={CallScreen} />
      <Stack.Screen name="Clock" component={ClockInScreen} options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="Profile" component={AccountScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="Inbox" component={InboxScreen} />
      <Stack.Screen name="Menu" component={MenuScreen} options={{ animation: "fade", presentation: "fullScreenModal" }} />
    </Stack.Navigator>
  );
}
