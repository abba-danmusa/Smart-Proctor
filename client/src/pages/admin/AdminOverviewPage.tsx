import { Badge, Box, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { useOutletContext } from "react-router-dom";
import type { AdminLayoutOutletContext } from "./AdminDashboardLayout";
import { adminOverviewMetrics } from "./adminDashboardData";

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Box
      rounded="2xl"
      border="1px solid"
      borderColor="rgba(15, 23, 42, 0.08)"
      bg="white"
      shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
      p={5}
    >
      <Text fontSize="sm" color="gray.500" mb={2}>
        {title}
      </Text>
      <Heading size="md" color="gray.800">
        {value}
      </Heading>
      <Text fontSize="sm" color="gray.600" mt={2}>
        {subtitle}
      </Text>
    </Box>
  );
}

export default function AdminOverviewPage() {
  const { user } = useOutletContext<AdminLayoutOutletContext>();

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Text
          fontSize="xs"
          fontWeight="bold"
          textTransform="uppercase"
          letterSpacing="0.12em"
          color="orange.600"
          mb={2}
        >
          Admin Overview
        </Text>
        <Heading size="lg" color="gray.800" mb={1}>
          Welcome, {user.fullName}
        </Heading>
        <Text color="gray.600">Manage institutions, users, system logs, and platform-wide policy configuration from one workspace.</Text>
      </Box>

      <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }} gap={4}>
        <StatCard
          title="Total Users"
          value={String(adminOverviewMetrics.totalUsers)}
          subtitle="Registered accounts across all connected institutions."
        />
        <StatCard
          title="Active Exams"
          value={String(adminOverviewMetrics.activeExams)}
          subtitle="Exam sessions currently running on the platform."
        />
        <StatCard
          title="Total Incidents"
          value={String(adminOverviewMetrics.totalIncidents)}
          subtitle="Security and integrity incidents queued for review."
        />
        <Box
          rounded="2xl"
          border="1px solid"
          borderColor="rgba(15, 23, 42, 0.08)"
          bg="white"
          shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
          p={5}
        >
          <Text fontSize="sm" color="gray.500" mb={2}>
            System Health
          </Text>
          <Heading size="md" color="gray.800" mb={2}>
            {adminOverviewMetrics.systemHealth}%
          </Heading>
          <Badge colorPalette={adminOverviewMetrics.systemHealth >= 95 ? "green" : "orange"}>
            {adminOverviewMetrics.systemHealth >= 95 ? "Healthy" : "Needs Attention"}
          </Badge>
          <Text fontSize="sm" color="gray.600" mt={2}>
            Infrastructure status based on service uptime and response latency.
          </Text>
        </Box>
      </Grid>
    </VStack>
  );
}
