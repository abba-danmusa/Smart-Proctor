import { Badge, Box, Button, Flex, Grid, Heading, Text, VStack } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import type { UserRole } from "../../lib/authSession";
import { adminUsers, type AdminUserStatus } from "./adminDashboardData";

function getRoleColor(role: UserRole) {
  if (role === "admin") return "red";
  if (role === "lecturer") return "orange";
  return "blue";
}

function getRoleLabel(role: UserRole) {
  if (role === "admin") return "Admin";
  if (role === "lecturer") return "Lecturer";
  return "Student";
}

function getStatusColor(status: AdminUserStatus) {
  if (status === "active") return "green";
  return "red";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState(adminUsers);

  const activeUsers = useMemo(() => users.filter((user) => user.status === "active").length, [users]);

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? {
              ...user,
              status: user.status === "active" ? "suspended" : "active",
            }
          : user,
      ),
    );
  };

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Users
        </Heading>
        <Text color="gray.600">Manage account access, role assignments, and enforcement status across all institutions.</Text>
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
          Total users: {users.length}
        </Text>
        <Text color="orange.700" fontSize="sm">
          Active: {activeUsers} | Suspended: {users.length - activeUsers}
        </Text>
      </Flex>

      <Box
        rounded="2xl"
        border="1px solid"
        borderColor="rgba(15, 23, 42, 0.08)"
        bg="white"
        shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
        overflowX="auto"
      >
        <Grid
          templateColumns="minmax(210px, 1.9fr) minmax(120px, 0.9fr) minmax(220px, 1.5fr) minmax(120px, 0.8fr) minmax(140px, 1fr)"
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
          minW="920px"
        >
          <Text>Name</Text>
          <Text>Role</Text>
          <Text>Institution</Text>
          <Text>Status</Text>
          <Text>Actions</Text>
        </Grid>

        <VStack align="stretch" gap={0} minW="920px">
          {users.map((user) => {
            const canSuspend = user.status === "active";

            return (
              <Grid
                key={user.id}
                templateColumns="minmax(210px, 1.9fr) minmax(120px, 0.9fr) minmax(220px, 1.5fr) minmax(120px, 0.8fr) minmax(140px, 1fr)"
                gap={4}
                px={5}
                py={4}
                borderTopWidth="1px"
                borderColor="gray.100"
                alignItems="center"
              >
                <Text color="gray.800" fontWeight="semibold">
                  {user.name}
                </Text>
                <Badge colorPalette={getRoleColor(user.role)} w="fit-content">
                  {getRoleLabel(user.role)}
                </Badge>
                <Text color="gray.700">{user.institution}</Text>
                <Badge colorPalette={getStatusColor(user.status)} w="fit-content">
                  {user.status === "active" ? "Active" : "Suspended"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  colorPalette={canSuspend ? "red" : "green"}
                  onClick={() => toggleUserStatus(user.id)}
                  w="fit-content"
                >
                  {canSuspend ? "Suspend" : "Activate"}
                </Button>
              </Grid>
            );
          })}
        </VStack>
      </Box>
    </VStack>
  );
}
