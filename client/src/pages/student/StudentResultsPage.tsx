import { Badge, Box, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { studentResultRecords } from "./studentDashboardData";

function getResultColor(status: "Passed" | "Failed") {
  return status === "Passed" ? "green" : "red";
}

export default function StudentResultsPage() {
  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Results
        </Heading>
        <Text color="gray.600">Review your performance and exam integrity outcomes.</Text>
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
          templateColumns="minmax(220px, 2fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(260px, 2fr)"
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
          minW="760px"
        >
          <Text>Exam Name</Text>
          <Text>Score</Text>
          <Text>Status</Text>
          <Text>Integrity Score</Text>
        </Grid>

        <VStack align="stretch" gap={0} minW="760px">
          {studentResultRecords.map((result) => (
            <Grid
              key={result.id}
              templateColumns="minmax(220px, 2fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(260px, 2fr)"
              gap={4}
              px={5}
              py={4}
              borderTopWidth="1px"
              borderColor="gray.100"
              alignItems="center"
            >
              <Text color="gray.800" fontWeight="semibold">
                {result.examName}
              </Text>
              <Text color="gray.700">{result.score}%</Text>
              <Badge colorPalette={getResultColor(result.status)} w="fit-content">
                {result.status}
              </Badge>
              <Text color="gray.700" fontSize="sm">
                Integrity Score: {result.integrityScore}% - No suspicious activity detected
              </Text>
            </Grid>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}
