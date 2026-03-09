import { Badge, Box, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { adminSystemLogs, type AdminLogEventType } from "./adminDashboardData";

function getEventTypeColor(eventType: AdminLogEventType) {
  if (eventType === "authentication") return "blue";
  if (eventType === "user_management") return "orange";
  if (eventType === "exam_activity") return "red";
  return "gray";
}

function getEventTypeLabel(eventType: AdminLogEventType) {
  if (eventType === "authentication") return "Authentication";
  if (eventType === "user_management") return "User Management";
  if (eventType === "exam_activity") return "Exam Activity";
  return "System Configuration";
}

export default function AdminSystemLogsPage() {
  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          System Logs
        </Heading>
        <Text color="gray.600">Central audit trail for authentication, exam activity, user administration, and platform changes.</Text>
      </Box>

      <Box
        rounded="2xl"
        border="1px solid"
        borderColor="rgba(15, 23, 42, 0.08)"
        bg="white"
        shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
        overflowX="auto"
      >
        <Grid
          templateColumns="minmax(180px, 1.2fr) minmax(250px, 2fr) minmax(190px, 1.4fr) minmax(140px, 1fr) minmax(150px, 1fr)"
          gap={4}
          px={5}
          py={4}
          borderBottomWidth="1px"
          borderColor="gray.100"
          fontSize="xs"
          fontWeight="bold"
          color="gray.500"
          textTransform="uppercase"
          letterSpacing="0.08em"
          minW="980px"
        >
          <Text>User</Text>
          <Text>Action</Text>
          <Text>Timestamp</Text>
          <Text>IP Address</Text>
          <Text>Event Type</Text>
        </Grid>

        <VStack align="stretch" gap={0} minW="980px">
          {adminSystemLogs.map((log) => (
            <Grid
              key={log.id}
              templateColumns="minmax(180px, 1.2fr) minmax(250px, 2fr) minmax(190px, 1.4fr) minmax(140px, 1fr) minmax(150px, 1fr)"
              gap={4}
              px={5}
              py={4}
              borderTopWidth="1px"
              borderColor="gray.100"
              alignItems="center"
            >
              <Text color="gray.800" fontWeight="semibold">
                {log.user}
              </Text>
              <Text color="gray.700">{log.action}</Text>
              <Text color="gray.700" fontSize="sm">
                {log.timestamp}
              </Text>
              <Text color="gray.700">{log.ipAddress}</Text>
              <Badge colorPalette={getEventTypeColor(log.eventType)} w="fit-content">
                {getEventTypeLabel(log.eventType)}
              </Badge>
            </Grid>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}
