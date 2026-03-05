import { Badge, Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import {
  adminSystemSettingOptions,
  defaultAdminSystemSettings,
  type AdminSystemSettingKey,
  type AdminSystemSettingsState,
} from "./adminDashboardData";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSystemSettingsState>({ ...defaultAdminSystemSettings });

  const enabledSettingsCount = useMemo(() => Object.values(settings).filter(Boolean).length, [settings]);

  const toggleSetting = (key: AdminSystemSettingKey) => {
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
        <Text color="gray.600">Configure global security, onboarding, and platform operation policies.</Text>
      </Box>

      <Flex
        justify="space-between"
        align="center"
        gap={3}
        p={4}
        rounded="xl"
        border="1px solid"
        borderColor="orange.200"
        bg="orange.50"
        flexWrap="wrap"
      >
        <Text color="orange.800" fontWeight="semibold">
          System configuration
        </Text>
        <Text color="orange.700" fontSize="sm">
          Enabled policies: {enabledSettingsCount}/{adminSystemSettingOptions.length}
        </Text>
      </Flex>

      <Box
        rounded="2xl"
        border="1px solid"
        borderColor="rgba(15, 23, 42, 0.08)"
        bg="white"
        shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
        p={5}
      >
        <VStack align="stretch" gap={4}>
          {adminSystemSettingOptions.map((setting) => (
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
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette={settings[setting.key] ? "red" : "green"}
                  onClick={() => toggleSetting(setting.key)}
                >
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
