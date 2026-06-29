import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Activity,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Link2,
  LogOut,
  MessageCircle,
  Moon,
  Search,
  Send,
  Stethoscope,
  Sun,
  User,
  UserCircle,
  Users,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";

import { useAuth } from "../../auth/AuthProvider";
import type { MeResponse, UserRole } from "../../auth/types";
import { useAppTheme } from "../../theme/AppThemeProvider";
import { Screen } from "../../ui/Screen";

type PortalKind = "patient" | "doctor";
type PatientSectionKey =
  | "dashboard"
  | "profile"
  | "documents"
  | "doctors"
  | "mealPlans"
  | "fitnessPlans"
  | "clinicalNotes"
  | "chat";
type DoctorSectionKey = "dashboard" | "patients" | "connections" | "profile";
type SectionKey = PatientSectionKey | DoctorSectionKey;

type Metric = {
  label: string;
  value: string;
};

type FeatureCard = {
  title: string;
  body: string;
  meta?: string;
};

type QuickAction = {
  label: string;
  target?: SectionKey;
};

type PortalSection = {
  key: SectionKey;
  label: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  metrics: Metric[];
  actions: QuickAction[];
  cards: FeatureCard[];
};

const patientSections: PortalSection[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    title: "Care overview",
    subtitle: "Your profile, plans, documents, and care team in one place.",
    icon: LayoutDashboard,
    metrics: [
      { label: "Profile", value: "Active" },
      { label: "Plans", value: "2" },
      { label: "Care team", value: "Ready" },
    ],
    actions: [
      { label: "Ask a question", target: "chat" },
      { label: "Review documents", target: "documents" },
    ],
    cards: [
      {
        title: "Today",
        body: "Check your latest care notes and keep your profile details current before the next visit.",
        meta: "Priority",
      },
      {
        title: "Health context",
        body: "Conditions, medications, allergies, lifestyle, and family history support each answer.",
      },
    ],
  },
  {
    key: "profile",
    label: "Profile",
    title: "Patient profile",
    subtitle: "Manage demographics, emergency contact, conditions, medications, and allergies.",
    icon: User,
    metrics: [
      { label: "Identity", value: "Verified" },
      { label: "History", value: "Editable" },
      { label: "Safety", value: "Tracked" },
    ],
    actions: [
      { label: "Open documents", target: "documents" },
      { label: "Find doctors", target: "doctors" },
    ],
    cards: [
      {
        title: "Core details",
        body: "Name, date of birth, sex, phone, address, and emergency contact stay grouped for quick review.",
      },
      {
        title: "Clinical context",
        body: "Conditions, medications, allergies, family history, and lifestyle are presented as editable care facts.",
      },
    ],
  },
  {
    key: "documents",
    label: "Documents",
    title: "Documents",
    subtitle: "Upload records, browse categories, and review lab analysis.",
    icon: FileText,
    metrics: [
      { label: "Categories", value: "6" },
      { label: "Preview", value: "On" },
      { label: "Labs", value: "Parsed" },
    ],
    actions: [
      { label: "Ask about a lab", target: "chat" },
      { label: "Share with doctor", target: "doctors" },
    ],
    cards: [
      {
        title: "Record library",
        body: "Medical documents are organized by type with quick preview and detail review patterns from the web app.",
      },
      {
        title: "Lab review",
        body: "Abnormal ranges, trends, and analysis summaries have a dedicated review area.",
      },
    ],
  },
  {
    key: "doctors",
    label: "Doctors",
    title: "My doctors",
    subtitle: "See connected doctors and manage care relationships.",
    icon: Stethoscope,
    metrics: [
      { label: "Connections", value: "Care team" },
      { label: "Requests", value: "Visible" },
      { label: "Sharing", value: "Controlled" },
    ],
    actions: [
      { label: "Review profile", target: "profile" },
      { label: "Open notes", target: "clinicalNotes" },
    ],
    cards: [
      {
        title: "Connected care",
        body: "Doctor cards emphasize specialty, connection state, and next actions for shared care.",
      },
      {
        title: "Requests",
        body: "Incoming and outgoing connection requests are separated from active relationships.",
      },
    ],
  },
  {
    key: "mealPlans",
    label: "Meal plans",
    title: "Meal plans",
    subtitle: "Review nutrition plans shared through chat and care recommendations.",
    icon: Utensils,
    metrics: [
      { label: "Plans", value: "Saved" },
      { label: "Meals", value: "Daily" },
      { label: "Notes", value: "Attached" },
    ],
    actions: [
      { label: "Ask for changes", target: "chat" },
      { label: "View fitness", target: "fitnessPlans" },
    ],
    cards: [
      {
        title: "Plan detail",
        body: "Meals, portions, nutrition notes, and safety guidance are grouped for quick mobile scanning.",
      },
      {
        title: "Follow-up",
        body: "Questions about substitutions or restrictions route naturally back to chat.",
      },
    ],
  },
  {
    key: "fitnessPlans",
    label: "Fitness plans",
    title: "Fitness plans",
    subtitle: "Track prescribed activity plans, intensity, schedule, and precautions.",
    icon: Activity,
    metrics: [
      { label: "Schedule", value: "Weekly" },
      { label: "Intensity", value: "Guided" },
      { label: "Safety", value: "Included" },
    ],
    actions: [
      { label: "Ask a coach", target: "chat" },
      { label: "View meals", target: "mealPlans" },
    ],
    cards: [
      {
        title: "Activity blocks",
        body: "Warmups, exercises, recovery, and condition-specific precautions are split into readable sections.",
      },
      {
        title: "Progress review",
        body: "Saved plans preserve the context of the chat that generated them.",
      },
    ],
  },
  {
    key: "clinicalNotes",
    label: "Clinical notes",
    title: "Clinical notes",
    subtitle: "Read visit notes and pre-visit summaries shared by your care team.",
    icon: ClipboardList,
    metrics: [
      { label: "Notes", value: "Shared" },
      { label: "Briefs", value: "Ready" },
      { label: "Details", value: "Readable" },
    ],
    actions: [
      { label: "Ask about note", target: "chat" },
      { label: "See doctors", target: "doctors" },
    ],
    cards: [
      {
        title: "Visit summaries",
        body: "Problems, medications, assessment, plan, and follow-ups are shaped for a small screen.",
      },
      {
        title: "Clinical detail",
        body: "Longer notes open into focused reading views without crowding the dashboard.",
      },
    ],
  },
  {
    key: "chat",
    label: "Chat",
    title: "Care chat",
    subtitle: "Ask health questions grounded in your profile and records.",
    icon: MessageCircle,
    metrics: [
      { label: "Context", value: "Profile" },
      { label: "Mode", value: "Guided" },
      { label: "Plans", value: "Shareable" },
    ],
    actions: [
      { label: "Review profile", target: "profile" },
      { label: "Open plans", target: "mealPlans" },
    ],
    cards: [
      {
        title: "Suggested prompt",
        body: "What should I ask my doctor about my recent symptoms?",
      },
      {
        title: "Generated outputs",
        body: "Meal plans, fitness plans, and differential diagnosis cards stay connected to the conversation.",
      },
    ],
  },
];

const doctorSections: PortalSection[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    title: "Doctor dashboard",
    subtitle: "Review patient activity, pending requests, and recent care work.",
    icon: LayoutDashboard,
    metrics: [
      { label: "Patients", value: "Panel" },
      { label: "Requests", value: "Pending" },
      { label: "Activity", value: "Recent" },
    ],
    actions: [
      { label: "Open patients", target: "patients" },
      { label: "Manage requests", target: "connections" },
    ],
    cards: [
      {
        title: "Recent activity",
        body: "Patient document uploads, note edits, and care plan updates are grouped for quick triage.",
      },
      {
        title: "Pre-visit readiness",
        body: "High-level patient context is surfaced before opening an individual chart.",
      },
    ],
  },
  {
    key: "patients",
    label: "Patients",
    title: "Patients",
    subtitle: "Search the patient panel and open records, notes, documents, chat, or prescriptions.",
    icon: Users,
    metrics: [
      { label: "Search", value: "Enabled" },
      { label: "Records", value: "Linked" },
      { label: "Notes", value: "Editable" },
    ],
    actions: [
      { label: "Connections", target: "connections" },
      { label: "Profile", target: "profile" },
    ],
    cards: [
      {
        title: "Patient cards",
        body: "Each card prioritizes demographics, conditions, recent documents, and the next clinical action.",
      },
      {
        title: "Patient workspace",
        body: "Details, documents, chat, prescriptions, and notes stay accessible once a patient is selected.",
      },
    ],
  },
  {
    key: "connections",
    label: "Connections",
    title: "Connections",
    subtitle: "Manage patient connection requests and active care relationships.",
    icon: Link2,
    metrics: [
      { label: "Incoming", value: "Review" },
      { label: "Active", value: "Manage" },
      { label: "Access", value: "Scoped" },
    ],
    actions: [
      { label: "View patients", target: "patients" },
      { label: "Update profile", target: "profile" },
    ],
    cards: [
      {
        title: "Request queue",
        body: "Accept, decline, and review requests without mixing them into the active patient panel.",
      },
      {
        title: "Relationship state",
        body: "Connection status is visible before opening a patient record.",
      },
    ],
  },
  {
    key: "profile",
    label: "Profile",
    title: "Doctor profile",
    subtitle: "Maintain credentials, institution, contact information, and education.",
    icon: UserCircle,
    metrics: [
      { label: "Credentials", value: "Editable" },
      { label: "Institution", value: "Listed" },
      { label: "Contact", value: "Current" },
    ],
    actions: [
      { label: "See dashboard", target: "dashboard" },
      { label: "Open patients", target: "patients" },
    ],
    cards: [
      {
        title: "Professional details",
        body: "Specialty, credentials, NPI-style identifiers, education, and affiliations use focused form groups.",
      },
      {
        title: "Availability context",
        body: "Contact and institution fields support patient-facing connection workflows.",
      },
    ],
  },
];

export function MobilePortalScreen() {
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useAppTheme();
  const theme = useTheme();
  const portalKind = getPortalKind(user?.role);
  const sections = portalKind === "doctor" ? doctorSections : patientSections;
  const [activeKey, setActiveKey] = useState<SectionKey>(sections[0].key);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");

  useEffect(() => {
    if (!sections.some((section) => section.key === activeKey)) {
      setActiveKey(sections[0].key);
    }
  }, [activeKey, sections]);

  const activeSection = useMemo(
    () => sections.find((section) => section.key === activeKey) ?? sections[0],
    [activeKey, sections]
  );
  const ActiveIcon = activeSection.icon;

  const selectSection = (sectionKey: SectionKey) => {
    setActiveKey(sectionKey);
    setNotice(null);
    setIsDrawerOpen(false);
  };

  const handleAction = (action: QuickAction) => {
    if (action.target) {
      selectSection(action.target);
      return;
    }
    setNotice(`${action.label} is ready.`);
  };

  const submitChatDraft = () => {
    if (!chatDraft.trim()) return;
    setNotice("Message drafted for the care chat.");
    setChatDraft("");
  };

  return (
    <Screen padded={false}>
      <View style={styles.shell}>
        <PortalHeader
          isDark={isDark}
          onLogout={() => void logout()}
          onOpenNavigation={() => setIsDrawerOpen(true)}
          onToggleTheme={toggleTheme}
          portalKind={portalKind}
          user={user}
        />

        <PortalNavigationDrawer
          activeKey={activeSection.key}
          isDark={isDark}
          onClose={() => setIsDrawerOpen(false)}
          onLogout={() => {
            setIsDrawerOpen(false);
            void logout();
          }}
          onSelect={selectSection}
          onToggleTheme={toggleTheme}
          open={isDrawerOpen}
          portalKind={portalKind}
          sections={sections}
          user={user}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.hero,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <View
              style={[
                styles.heroIcon,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <ActiveIcon
                color={theme.colors.onPrimaryContainer}
                size={24}
                strokeWidth={2.25}
              />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.kicker} variant="labelMedium">
                {portalKind === "doctor" ? "Doctor workspace" : "Patient workspace"}
              </Text>
              <Text style={styles.title} variant="headlineSmall">
                {activeSection.title}
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodyMedium">
                {activeSection.subtitle}
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            {activeSection.metrics.map((metric) => (
              <View
                key={`${activeSection.key}-${metric.label}`}
                style={[
                  styles.metric,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <Text style={styles.metricValue} variant="titleMedium">
                  {metric.value}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }} variant="labelSmall">
                  {metric.label}
                </Text>
              </View>
            ))}
          </View>

          {notice ? (
            <View
              style={[
                styles.notice,
                {
                  backgroundColor: theme.colors.secondaryContainer,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <Text style={{ color: theme.colors.onSecondaryContainer }} variant="bodySmall">
                {notice}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            {activeSection.actions.map((action) => (
              <Button
                compact
                key={`${activeSection.key}-${action.label}`}
                mode={action === activeSection.actions[0] ? "contained" : "outlined"}
                onPress={() => handleAction(action)}
                style={styles.actionButton}
              >
                {action.label}
              </Button>
            ))}
          </View>

          {activeSection.key === "chat" ? (
            <View
              style={[
                styles.chatComposer,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <TextInput
                dense
                mode="outlined"
                onChangeText={setChatDraft}
                outlineStyle={styles.chatInputOutline}
                placeholder="Ask a care question"
                style={styles.chatInput}
                value={chatDraft}
              />
              <Pressable
                accessibilityLabel="Draft chat message"
                accessibilityRole="button"
                disabled={!chatDraft.trim()}
                onPress={submitChatDraft}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    backgroundColor: chatDraft.trim()
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Send
                  color={chatDraft.trim() ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                  size={20}
                />
              </Pressable>
            </View>
          ) : null}

          {activeSection.key === "patients" ? (
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <Search color={theme.colors.onSurfaceVariant} size={18} />
              <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodyMedium">
                Search patients by name, condition, or recent activity
              </Text>
            </View>
          ) : null}

          <View style={styles.cardGrid}>
            {activeSection.cards.map((card) => (
              <FeatureCardView card={card} key={`${activeSection.key}-${card.title}`} />
            ))}
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function PortalHeader({
  isDark,
  onLogout,
  onOpenNavigation,
  onToggleTheme,
  portalKind,
  user,
}: {
  isDark: boolean;
  onLogout: () => void;
  onOpenNavigation: () => void;
  onToggleTheme: () => void;
  portalKind: PortalKind;
  user: MeResponse | null;
}) {
  const theme = useTheme();
  const ModeIcon = isDark ? Sun : Moon;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.outline,
        },
      ]}
    >
      <Pressable
        accessibilityHint="Opens portal navigation"
        accessibilityLabel="Open portal navigation"
        accessibilityRole="button"
        onPress={onOpenNavigation}
        style={({ pressed }) => [styles.brandRowButton, pressed && styles.pressed]}
      >
        <View style={[styles.brandMark, { backgroundColor: theme.colors.onSurface }]}>
          <Text style={[styles.brandMarkText, { color: theme.colors.surface }]}>P</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.portalLabel} variant="labelMedium">
            {portalKind === "doctor" ? "Doctor portal" : "Patient portal"}
          </Text>
          <Text numberOfLines={1} style={styles.email} variant="bodySmall">
            {user?.email ?? "Signed in"}
          </Text>
        </View>
      </Pressable>

      <View style={styles.accountControls}>
        <IconCircleButton
          accessibilityLabel={isDark ? "Use light theme" : "Use dark theme"}
          icon={ModeIcon}
          onPress={onToggleTheme}
        />
        <IconCircleButton
          accessibilityLabel="Log out"
          icon={LogOut}
          onPress={onLogout}
        />
      </View>
    </View>
  );
}

function PortalNavigationDrawer({
  activeKey,
  isDark,
  onClose,
  onLogout,
  onSelect,
  onToggleTheme,
  open,
  portalKind,
  sections,
  user,
}: {
  activeKey: SectionKey;
  isDark: boolean;
  onClose: () => void;
  onLogout: () => void;
  onSelect: (sectionKey: SectionKey) => void;
  onToggleTheme: () => void;
  open: boolean;
  portalKind: PortalKind;
  sections: PortalSection[];
  user: MeResponse | null;
}) {
  const theme = useTheme();
  const ModeIcon = isDark ? Sun : Moon;
  const drawerProgress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const isMountedRef = useRef(true);
  const [isRendered, setRendered] = useState(open);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      drawerProgress.stopAnimation();
    };
  }, [drawerProgress]);

  useEffect(() => {
    if (open) {
      setRendered(true);
      Animated.timing(drawerProgress, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(drawerProgress, {
      duration: 180,
      easing: Easing.in(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && isMountedRef.current) {
        setRendered(false);
      }
    });
  }, [drawerProgress, open]);

  const backdropOpacity = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const drawerTranslateX = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-360, 0],
  });

  if (!isRendered) return null;

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={isRendered}
    >
      <View style={styles.drawerLayer}>
        <Animated.View style={[styles.drawerBackdrop, { opacity: backdropOpacity }]}>
          <Pressable
            accessibilityLabel="Close portal navigation"
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.drawerPanel,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.outline,
              transform: [{ translateX: drawerTranslateX }],
            },
          ]}
        >
          <View style={styles.drawerHeader}>
            <View style={styles.drawerIdentity}>
              <View style={[styles.brandMark, { backgroundColor: theme.colors.onSurface }]}>
                <Text style={[styles.brandMarkText, { color: theme.colors.surface }]}>P</Text>
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.portalLabel} variant="labelMedium">
                  {portalKind === "doctor" ? "Doctor portal" : "Patient portal"}
                </Text>
                <Text numberOfLines={1} style={styles.email} variant="bodySmall">
                  {user?.email ?? "Signed in"}
                </Text>
              </View>
            </View>
            <IconCircleButton
              accessibilityLabel="Close portal navigation"
              icon={X}
              onPress={onClose}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.drawerNavContent}
            showsVerticalScrollIndicator={false}
          >
            {sections.map((section) => (
              <DrawerNavItem
                active={section.key === activeKey}
                icon={section.icon}
                key={section.key}
                label={section.label}
                onPress={() => onSelect(section.key)}
              />
            ))}
          </ScrollView>

          <View style={[styles.drawerFooter, { borderTopColor: theme.colors.outline }]}>
            <DrawerNavItem
              active={false}
              icon={ModeIcon}
              label={isDark ? "Light mode" : "Dark mode"}
              onPress={onToggleTheme}
            />
            <DrawerNavItem
              active={false}
              icon={LogOut}
              label="Log out"
              onPress={onLogout}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function IconCircleButton({
  accessibilityLabel,
  icon: Icon,
  onPress,
}: {
  accessibilityLabel: string;
  icon: LucideIcon;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
        pressed && styles.pressed,
      ]}
    >
      <Icon color={theme.colors.onSurface} size={19} strokeWidth={2.2} />
    </Pressable>
  );
}

function DrawerNavItem({
  active,
  icon: Icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerNavItem,
        {
          backgroundColor: active ? theme.colors.primaryContainer : theme.colors.surface,
          borderColor: active ? theme.colors.primary : theme.colors.outline,
        },
        pressed && styles.pressed,
      ]}
    >
      <Icon
        color={active ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant}
        size={20}
        strokeWidth={2.2}
      />
      <Text
        numberOfLines={1}
        style={[
          styles.drawerNavLabel,
          { color: active ? theme.colors.onPrimaryContainer : theme.colors.onSurface },
        ]}
        variant="labelLarge"
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FeatureCardView({ card }: { card: FeatureCard }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.featureCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      <View style={styles.featureHeader}>
        <Text style={styles.cardTitle} variant="titleMedium">
          {card.title}
        </Text>
        {card.meta ? (
          <View
            style={[
              styles.metaPill,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Text
              style={{ color: theme.colors.onPrimaryContainer }}
              variant="labelSmall"
            >
              {card.meta}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={{ color: theme.colors.onSurfaceVariant }} variant="bodyMedium">
        {card.body}
      </Text>
    </View>
  );
}

function getPortalKind(role: UserRole | undefined): PortalKind {
  return role === "doctor" ? "doctor" : "patient";
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  brandRowButton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 11,
    minWidth: 0,
    paddingVertical: 4,
  },
  brandMark: {
    alignItems: "center",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  brandMarkText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  portalLabel: {
    fontWeight: "800",
    letterSpacing: 0,
  },
  email: {
    opacity: 0.72,
  },
  accountControls: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pressed: {
    opacity: 0.72,
  },
  drawerLayer: {
    flex: 1,
    flexDirection: "row",
  },
  drawerBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  drawerPanel: {
    borderWidth: 1,
    borderBottomRightRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    maxWidth: 340,
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  drawerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 14,
  },
  drawerIdentity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 11,
    minWidth: 0,
  },
  drawerNavContent: {
    gap: 10,
    paddingBottom: 14,
    paddingTop: 4,
  },
  drawerNavItem: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  drawerNavLabel: {
    flex: 1,
    fontWeight: "800",
    letterSpacing: 0,
  },
  drawerFooter: {
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 14,
  },
  content: {
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  hero: {
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  heroIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  heroCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  kicker: {
    fontWeight: "800",
    letterSpacing: 0,
    opacity: 0.68,
  },
  title: {
    fontWeight: "800",
    letterSpacing: 0,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metric: {
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    minHeight: 78,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  metricValue: {
    fontWeight: "800",
    letterSpacing: 0,
  },
  notice: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionButton: {
    borderRadius: 12,
  },
  chatComposer: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10,
  },
  chatInput: {
    flex: 1,
  },
  chatInputOutline: {
    borderRadius: 12,
  },
  sendButton: {
    alignItems: "center",
    borderRadius: 13,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  searchBox: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  cardGrid: {
    gap: 12,
  },
  featureCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  featureHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  cardTitle: {
    flex: 1,
    fontWeight: "800",
    letterSpacing: 0,
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
});
