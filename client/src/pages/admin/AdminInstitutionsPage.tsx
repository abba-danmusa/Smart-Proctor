import { Badge, Box, Button, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { adminInstitutions, type InstitutionStatus } from "./adminDashboardData";

function getInstitutionStatusColor(status: InstitutionStatus) {
  if (status === "operational") return "green";
  if (status === "degraded") return "orange";
  return "gray";
}

function getInstitutionStatusLabel(status: InstitutionStatus) {
  if (status === "operational") return "Operational";
  if (status === "degraded") return "Degraded";
  return "Maintenance";
}

export default function AdminInstitutionsPage() {
  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Institutions
        </Heading>
        <Text color="gray.600">Track organization-level health, usage volume, and active exam operations.</Text>
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
          templateColumns="minmax(230px, 1.8fr) minmax(170px, 1.3fr) minmax(100px, 0.8fr) minmax(120px, 0.9fr) minmax(130px, 0.9fr) minmax(120px, 0.8fr)"
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
          <Text>Institution</Text>
          <Text>Location</Text>
          <Text>Users</Text>
          <Text>Active Exams</Text>
          <Text>Status</Text>
          <Text>Actions</Text>
        </Grid>

        <VStack align="stretch" gap={0} minW="980px">
          {adminInstitutions.map((institution) => (
            <Grid
              key={institution.id}
              templateColumns="minmax(230px, 1.8fr) minmax(170px, 1.3fr) minmax(100px, 0.8fr) minmax(120px, 0.9fr) minmax(130px, 0.9fr) minmax(120px, 0.8fr)"
              gap={4}
              px={5}
              py={4}
              borderTopWidth="1px"
              borderColor="gray.100"
              alignItems="center"
            >
              <Text color="gray.800" fontWeight="semibold">
                {institution.name}
              </Text>
              <Text color="gray.700">{institution.location}</Text>
              <Text color="gray.700">{institution.totalUsers}</Text>
              <Text color="gray.700">{institution.activeExams}</Text>
              <Badge colorPalette={getInstitutionStatusColor(institution.status)} w="fit-content">
                {getInstitutionStatusLabel(institution.status)}
              </Badge>
              <Button size="sm" variant="outline" colorPalette="orange" w="fit-content">
                Manage
              </Button>
            </Grid>
          ))}
        </VStack>
      </Box>
    </VStack>
  );
}
