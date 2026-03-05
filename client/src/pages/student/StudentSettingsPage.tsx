import { Badge, Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { useState } from "react";

type StudentSettingsState = {
  examReminders: boolean;
  resultsAlerts: boolean;
  profileSecurityAlerts: boolean;
};

const initialSettings: StudentSettingsState = {
  examReminders: true,
  resultsAlerts: true,
  profileSecurityAlerts: true,
};

const settingConfig: Array<{ key: keyof StudentSettingsState; title: string; description: string }> = [
  {
    key: "examReminders",
    title: "Exam reminders",
    description: "Receive reminders before each scheduled exam session.",
  },
  {
    key: "resultsAlerts",
    title: "Result alerts",
    description: "Get notified when a graded exam result becomes available.",
  },
  {
    key: "profileSecurityAlerts",
    title: "Face ID security alerts",
    description: "Receive alerts when face identity data is updated.",
  },
];

export default function StudentSettingsPage() {
  const [settings, setSettings] = useState<StudentSettingsState>(initialSettings);

  const toggleSetting = (key: keyof StudentSettingsState) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Settings
        </Heading>
        <Text color="gray.600">Configure exam alerts, result updates, and identity security notifications.</Text>
      </Box>

      <Box
        rounded="2xl"
        border="1px solid"
        borderColor="rgba(15, 23, 42, 0.08)"
        bg="white"
        shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
        p={5}
      >
        <VStack align="stretch" gap={4}>
          {settingConfig.map((setting) => (
            <Flex
              key={setting.key}
              justify="space-between"
              align="center"
              gap={3}
              p={4}
              rounded="xl"
              border="1px solid"
              borderColor="gray.200"
              bg="gray.50"
              flexWrap="wrap"
            >
              <Box>
                <Text fontWeight="semibold" color="gray.800" mb={1}>
                  {setting.title}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {setting.description}
                </Text>
              </Box>

              <Flex align="center" gap={3}>
                <Badge colorPalette={settings[setting.key] ? "green" : "gray"}>
                  {settings[setting.key] ? "Enabled" : "Disabled"}
                </Badge>
                <Button size="sm" variant="outline" colorPalette="blue" onClick={() => toggleSetting(setting.key)}>
                  {settings[setting.key] ? "Disable" : "Enable"}
                </Button>
              </Flex>
            </Flex>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}
