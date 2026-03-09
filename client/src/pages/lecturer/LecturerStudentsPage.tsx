import { Badge, Box, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { lecturerStudents } from "./lecturerDashboardData";

function getIntegrityColor(score: number) {
  if (score >= 90) return "green";
  if (score >= 75) return "orange";
  return "red";
}

function getFlagColor(flagCount: number) {
  if (flagCount >= 4) return "red";
  if (flagCount >= 1) return "orange";
  return "green";
}

export default function LecturerStudentsPage() {
  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Students
        </Heading>
        <Text color="gray.600">Review student integrity history and identify candidates requiring manual attention.</Text>
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
          templateColumns="minmax(220px, 1.8fr) minmax(120px, 1fr) minmax(170px, 1.2fr) minmax(80px, 0.7fr) minmax(100px, 0.8fr) minmax(140px, 1fr) minmax(130px, 1fr)"
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
          minW="1040px"
        >
          <Text>Student</Text>
          <Text>ID</Text>
          <Text>Department</Text>
          <Text>Level</Text>
          <Text>Exams</Text>
          <Text>Avg Integrity</Text>
          <Text>Flags This Month</Text>
        </Grid>

        <VStack align="stretch" gap={0} minW="1040px">
          {lecturerStudents.map((student) => (
            <Grid
              key={student.id}
              templateColumns="minmax(220px, 1.8fr) minmax(120px, 1fr) minmax(170px, 1.2fr) minmax(80px, 0.7fr) minmax(100px, 0.8fr) minmax(140px, 1fr) minmax(130px, 1fr)"
              gap={4}
              px={5}
              py={4}
              borderTopWidth="1px"
              borderColor="gray.100"
              alignItems="center"
            >
              <Text color="gray.800" fontWeight="semibold">
                {student.fullName}
              </Text>
              <Text color="gray.700">{student.studentId}</Text>
              <Text color="gray.700">{student.department}</Text>
              <Text color="gray.700">{student.level}</Text>
              <Text color="gray.700">{student.examsTaken}</Text>
              <Badge colorPalette={getIntegrityColor(student.averageIntegrityScore)} w="fit-content">
                {student.averageIntegrityScore}%
              </Badge>
              <Badge colorPalette={getFlagColor(student.flagsThisMonth)} w="fit-content">
                {student.flagsThisMonth}
              </Badge>
            </Grid>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}
