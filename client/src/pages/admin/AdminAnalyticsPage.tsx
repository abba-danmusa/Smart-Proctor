import { Badge, Box, Grid, Heading, Progress, Text, VStack } from "@chakra-ui/react";
import { adminEventTypeMetrics, adminIncidentTrend } from "./adminDashboardData";

export default function AdminAnalyticsPage() {
  const totalIncidents = adminIncidentTrend.reduce((sum, record) => sum + record.incidents, 0);
  const resolvedIncidents = adminIncidentTrend.reduce((sum, record) => sum + record.resolved, 0);
  const resolutionRate = totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0;

  const totalEvents = adminEventTypeMetrics.reduce((sum, metric) => sum + metric.count, 0);

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Analytics
        </Heading>
        <Text color="gray.600">Platform-wide incident and audit activity trends for operational decision-making.</Text>
      </Box>

      <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={4}>
        <Box
          rounded="2xl"
          border="1px solid"
          borderColor="rgba(15, 23, 42, 0.08)"
          bg="white"
          shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
          p={5}
        >
          <Heading size="sm" color="gray.800" mb={2}>
            Incident Resolution Rate
          </Heading>
          <Text fontSize="2xl" fontWeight="bold" color="orange.700" mb={3}>
            {resolutionRate}%
          </Text>
          <Progress.Root value={resolutionRate} colorPalette="orange" rounded="md" size="md">
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          <Text fontSize="sm" color="gray.600" mt={3}>
            Resolved {resolvedIncidents} of {totalIncidents} incidents recorded in the current period.
          </Text>
        </Box>

        <Box
          rounded="2xl"
          border="1px solid"
          borderColor="rgba(15, 23, 42, 0.08)"
          bg="white"
          shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
          p={5}
        >
          <Heading size="sm" color="gray.800" mb={4}>
            Audit Event Distribution
          </Heading>
          <VStack align="stretch" gap={3}>
            {adminEventTypeMetrics.map((metric) => {
              const ratio = totalEvents > 0 ? Math.round((metric.count / totalEvents) * 100) : 0;

              return (
                <Box key={metric.id}>
                  <Grid templateColumns="1fr auto auto" alignItems="center" gap={3} mb={2}>
                    <Text color="gray.800" fontWeight="semibold">
                      {metric.eventType}
                    </Text>
                    <Text color="gray.600" fontSize="sm">
                      {metric.count}
                    </Text>
                    <Badge colorPalette="orange">{ratio}%</Badge>
                  </Grid>
                  <Progress.Root value={ratio} colorPalette="orange" rounded="md" size="sm">
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                </Box>
              );
            })}
          </VStack>
        </Box>
      </Grid>

      <Box
        rounded="2xl"
        border="1px solid"
        borderColor="rgba(15, 23, 42, 0.08)"
        bg="white"
        shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
        p={5}
      >
        <Heading size="sm" color="gray.800" mb={4}>
          Incident Trend
        </Heading>
        <VStack align="stretch" gap={4}>
          {adminIncidentTrend.map((record) => {
            const resolvedRatio = record.incidents > 0 ? Math.round((record.resolved / record.incidents) * 100) : 0;

            return (
              <Box key={record.id}>
                <Grid templateColumns="1fr auto auto" gap={3} alignItems="center" mb={2}>
                  <Text color="gray.800" fontWeight="semibold">
                    {record.label}
                  </Text>
                  <Text color="gray.600" fontSize="sm">
                    {record.incidents} incidents
                  </Text>
                  <Badge colorPalette={resolvedRatio >= 80 ? "green" : "orange"}>{resolvedRatio}% resolved</Badge>
                </Grid>
                <Progress.Root value={resolvedRatio} colorPalette={resolvedRatio >= 80 ? "green" : "orange"} rounded="md" size="sm">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Box>
            );
          })}
        </VStack>
      </Box>
    </VStack>
  );
}
