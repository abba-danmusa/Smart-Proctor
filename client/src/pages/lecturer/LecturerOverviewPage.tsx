import { Box, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { useOutletContext } from "react-router-dom";
import type { LecturerLayoutOutletContext } from "./LecturerDashboardLayout";

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

export default function LecturerOverviewPage() {
  const { user } = useOutletContext<LecturerLayoutOutletContext>();

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Text
          fontSize="xs"
          fontWeight="bold"
          textTransform="uppercase"
          letterSpacing="0.12em"
          color="teal.600"
          mb={2}
        >
          Lecturer Dashboard
        </Text>
        <Heading size="lg" color="gray.800" mb={1}>
          Welcome, {user.fullName}
        </Heading>
        <Text color="gray.600">Monitor exam sessions, invigilation events, and grading workflow from one command center.</Text>
      </Box>

      <Grid templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }} gap={4}>
        <StatCard title="Published Exams" value="12" subtitle="Total assessments available to students this term." />
        <StatCard title="Live Sessions" value="2" subtitle="Active proctored sessions currently running." />
        <StatCard title="Flagged Events" value="9" subtitle="Suspicious incidents requiring manual review." />
        <StatCard title="Pending Grading" value="34" subtitle="Submitted scripts awaiting final score approval." />
      </Grid>
    </VStack>
  );
}
