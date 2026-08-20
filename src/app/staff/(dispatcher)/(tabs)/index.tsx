// import { router } from "expo-router";

// import {
//   AlertTriangle,
//   Bus,
//   Clock3,
//   ListStart,
//   MapPin,
//   MessageCircle,
//   TrendingUp,
//   Users
// } from "lucide-react-native";

// import {
//   ActivityIndicator,
//   FlatList,
//   Pressable,
//   RefreshControl,
//   SafeAreaView,
//   ScrollView,
//   Text,
//   View,
// } from "react-native";

// import { useDispatcherDashboard } from "@/src/shared/hooks/dispatcher/useDispatcherDashboard";

// import { useDispatcherAlerts } from "@/src/shared/hooks/dispatcher/useDispatcherAlerts";

// import {
//   AlertModal,
//   ClayCard,
//   JeepneyListItem,
//   NextToNotifyCard,
//   SectionHeader,
//   StatCard,
//   TripLogItem
// } from "../../../../src/staff/dispatcher/components/DispatcherDashboardComponents";

// const COLORS = {
//   ocean: "#0EA5E9",
//   oceanDark: "#0284C7",

//   inkDark: "#1E293B",
//   inkMuted: "#64748B",
//   inkLight: "#94A3B8",

//   greenDark: "#16A34A",
//   amber: "#F59E0B",
//   amberDark: "#D97706",
//   purple: "#8B5CF6",
//   red: "#EF4444",
// };

// export default function DispatcherDashboard() {
//   const {
//     user,
//     terminalId,

//     jeepneys,
//     tripLogs,

//     nextToDispatch,
//     stats,

//     loading,
//     refreshing,
//     error,

//     refreshJeepneys,
//     handleRefresh,
//   } = useDispatcherDashboard();

//   const {
//     alertModalVisible,
//     notifying,

//     openAlertModal,
//     closeAlertModal,

//     handleSendAlert,
//     handleNotifyDriver,
//   } = useDispatcherAlerts(user?.uid);

//   if (loading && jeepneys.length === 0) {
//     return (
//       <SafeAreaView className="flex-1 bg-clay-background">
//         <View className="flex-1 items-center justify-center">
//           <View className="h-16 w-16 items-center justify-center rounded-[20px] border border-white/80 bg-clay-surface">
//             <ActivityIndicator size="small" color={COLORS.ocean} />
//           </View>

//           <Text className="mt-4 text-[12px] font-bold text-ink-muted">
//             Loading dispatcher dashboard...
//           </Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   if (error) {
//     return (
//       <SafeAreaView className="flex-1 bg-clay-background">
//         <View className="flex-1 items-center justify-center px-6">
//           <ClayCard
//             style={{
//               width: "100%",
//               padding: 24,
//               alignItems: "center",
//             }}
//           >
//             <View className="h-14 w-14 items-center justify-center rounded-[17px] bg-red-50">
//               <AlertTriangle size={24} color={COLORS.red} strokeWidth={2.4} />
//             </View>

//             <Text className="mt-4 text-center text-[15px] font-extrabold text-ink-dark">
//               Something went wrong
//             </Text>

//             <Text className="mt-1 text-center text-[11px] font-medium text-ink-muted">
//               {error}
//             </Text>

//             <Pressable
//               onPress={refreshJeepneys}
//               className="mt-5 rounded-[16px] bg-sky-500 px-7 py-3"
//             >
//               <Text className="text-[12px] font-extrabold text-white">
//                 Retry
//               </Text>
//             </Pressable>
//           </ClayCard>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView className="flex-1 bg-clay-background">
//       <ScrollView
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl
//             refreshing={refreshing}
//             onRefresh={handleRefresh}
//             tintColor={COLORS.ocean}
//             colors={[COLORS.ocean]}
//           />
//         }
//         contentContainerStyle={{
//           paddingHorizontal: 16,
//           paddingTop: 12,
//           paddingBottom: 110,
//         }}
//       >
//         <View className="mb-5">
//           <View className="flex-row items-center">
//             <View className="h-11 w-11 items-center justify-center rounded-[15px] bg-ocean-100">
//               <Users size={21} color={COLORS.ocean} strokeWidth={2.5} />
//             </View>

//             <View className="ml-3 flex-1">
//               <Text className="text-[10px] font-bold uppercase tracking-[1px] text-ink-muted">
//                 Dispatcher Dashboard
//               </Text>

//               <Text className="mt-0.5 text-[21px] font-extrabold tracking-tight text-ink-dark">
//                 Good afternoon,
//               </Text>

//               <Text className="text-[12px] font-semibold text-sky-600">
//                 {user?.displayName || "Dispatcher"}
//               </Text>
//             </View>
//           </View>

//           <View className="mt-4 flex-row items-center">
//             <View className="mr-2 h-2 w-2 rounded-full bg-green-500" />

//             <Text className="text-[10px] font-semibold text-ink-muted">
//               {terminalId === 1 ? "Donsol" : "Daraga"} Terminal · Monitoring
//               active
//             </Text>
//           </View>
//         </View>

//         <NextToNotifyCard
//           jeepney={nextToDispatch}
//           onNotify={() => handleNotifyDriver(nextToDispatch)}
//           notifying={notifying}
//         />

//         <SectionHeader
//           title="Terminal Overview"
//           subtitle="Current fleet activity"
//         />

//         <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
//           <StatCard
//             label="Total Jeepneys"
//             value={stats.totalJeepneys}
//             icon={Bus}
//             iconColor={COLORS.ocean}
//             iconBackground="#E0F2FE"
//           />

//           <StatCard
//             label="Online"
//             value={stats.onlineJeepneys}
//             icon={TrendingUp}
//             iconColor={COLORS.greenDark}
//             iconBackground="#DCFCE7"
//           />

//           <StatCard
//             label="Waiting"
//             value={stats.waitingDrivers}
//             icon={Clock3}
//             iconColor={COLORS.amberDark}
//             iconBackground="#FEF3C7"
//           />

//           <StatCard
//             label="Queue"
//             value={stats.queueLength}
//             icon={Users}
//             iconColor={COLORS.purple}
//             iconBackground="#EDE9FE"
//           />
//         </View>

//         <SectionHeader title="Quick Actions" subtitle="Dispatcher tools" />

//         <View className="mb-5 flex-row flex-wrap justify-between gap-y-3">
//           {[
//             {
//               label: "Queue",
//               icon: ListStart,
//               route: "/staff/(dispatcher)/queue",
//               primary: true,
//             },
//             {
//               label: "Live Map",
//               icon: MapPin,
//               route: "/staff/(dispatcher)/map",
//               primary: false,
//             },
//             {
//               label: "Send Alert",
//               icon: AlertTriangle,
//               primary: false,
//               action: openAlertModal,
//             },
//             {
//               label: "Chat",
//               icon: MessageCircle,
//               route: "/staff/(dispatcher)/chat",
//               primary: false,
//             },
//           ].map((action) => {
//             const Icon = action.icon;

//             const onPress =
//               action.action ?? (() => router.push(action.route as any));

//             return (
//               <Pressable
//                 key={action.label}
//                 onPress={onPress}
//                 className={`w-[48%] rounded-[20px] border p-4 ${
//                   action.primary
//                     ? "border-sky-400 bg-sky-500"
//                     : "border-white/80 bg-clay-surface"
//                 }`}
//                 style={{
//                   minHeight: 90,
//                   shadowColor: action.primary ? COLORS.ocean : "#94A3B8",
//                   shadowOffset: {
//                     width: 0,
//                     height: 5,
//                   },
//                   shadowOpacity: action.primary ? 0.22 : 0.12,
//                   shadowRadius: 10,
//                   elevation: 3,
//                 }}
//               >
//                 <View
//                   className={`h-9 w-9 items-center justify-center rounded-[12px] ${
//                     action.primary ? "bg-white/20" : "bg-ocean-100"
//                   }`}
//                 >
//                   <Icon
//                     size={18}
//                     color={action.primary ? "#FFFFFF" : COLORS.ocean}
//                     strokeWidth={2.5}
//                   />
//                 </View>

//                 <Text
//                   className={`mt-3 text-[11px] font-extrabold ${
//                     action.primary ? "text-white" : "text-ink-dark"
//                   }`}
//                 >
//                   {action.label}
//                 </Text>
//               </Pressable>
//             );
//           })}
//         </View>

//         <SectionHeader
//           title="Jeepneys"
//           subtitle={`${jeepneys.length} vehicles at your terminal`}
//         />

//         <View className="mb-5">
//           {jeepneys.length === 0 ? (
//             <ClayCard
//               style={{
//                 padding: 22,
//                 alignItems: "center",
//               }}
//             >
//               <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-slate-100">
//                 <Bus size={22} color={COLORS.inkLight} strokeWidth={2.4} />
//               </View>

//               <Text className="mt-3 text-[12px] font-bold text-ink-muted">
//                 No jeepneys at your terminal
//               </Text>
//             </ClayCard>
//           ) : (
//             <FlatList
//               data={jeepneys.slice(0, 10)}
//               scrollEnabled={false}
//               keyExtractor={(item) => item.id}
//               renderItem={({ item }) => (
//                 <JeepneyListItem
//                   item={item}
//                   onPress={() =>
//                     router.push(`/staff/(dispatcher)/jeepney/${item.id}` as any)
//                   }
//                   onAlert={openAlertModal}
//                 />
//               )}
//             />
//           )}
//         </View>

//         <SectionHeader
//           title="Recent Trips"
//           subtitle={`${tripLogs.length} recent records`}
//         />

//         <ClayCard
//           style={{
//             padding: 0,
//             overflow: "hidden",
//           }}
//         >
//           {tripLogs.length === 0 ? (
//             <View className="items-center px-5 py-7">
//               <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-slate-100">
//                 <Clock3 size={20} color={COLORS.inkLight} strokeWidth={2.4} />
//               </View>

//               <Text className="mt-3 text-[11px] font-bold text-ink-muted">
//                 No recent trips
//               </Text>
//             </View>
//           ) : (
//             tripLogs
//               .slice(0, 5)
//               .map((item) => <TripLogItem key={item.id} item={item} />)
//           )}
//         </ClayCard>
//       </ScrollView>

//       <AlertModal
//         visible={alertModalVisible}
//         jeepneys={jeepneys}
//         onClose={closeAlertModal}
//         onSendAlert={handleSendAlert}
//       />
//     </SafeAreaView>
//   );
// }
