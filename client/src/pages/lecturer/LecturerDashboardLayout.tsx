import { Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { clearSessionUser, getDashboardPathForRole, getSessionUser, type SessionUser } from "../../lib/authSession";

const SIGNOUT_ENDPOINT = (() => {
  const baseUrl = (import.meta.env.VITE_AUTH_API_BASE_URL ?? "").trim();
  if (!baseUrl) {
    return "/api/users/signout";
  }

  return `${baseUrl.replace(/\/+$/, "")}/api/users/signout`;
})();

const lecturerNavItems: Array<{ label: string; to: string; end?: boolean }> = [
  { label: "Dashboard", to: "/dashboard/lecturer", end: true },
  { label: "Create Exam", to: "/dashboard/lecturer/create-exam" },
  { label: "My Exams", to: "/dashboard/lecturer/my-exams" },
  { label: "Live Monitoring", to: "/dashboard/lecturer/live-monitoring" },
  { label: "Reports", to: "/dashboard/lecturer/reports" },
  { label: "Students", to: "/dashboard/lecturer/students" },
];

export interface LecturerLayoutOutletContext {
  user: SessionUser;
}

export default function LecturerDashboardLayout() {
  const user = getSessionUser();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== "lecturer") {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  const handleSignOut = async () => {
    clearSessionUser();

    try {
      await fetch(SIGNOUT_ENDPOINT, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Session cleanup already happened on client side.
    }

    navigate("/", { replace: true });
  };

  return (
    <Flex minH="100vh" bg="linear-gradient(160deg, #f7f6f0 0%, #eef4ff 60%, #f2f8ff 100%)">
      <Flex
        as="aside"
        direction="column"
        w={{ base: "full", md: "280px" }}
        borderRightWidth={{ base: "0px", md: "1px" }}
        borderBottomWidth={{ base: "1px", md: "0px" }}
        borderColor="rgba(15, 23, 42, 0.09)"
        bg="rgba(255, 255, 255, 0.9)"
        backdropFilter="blur(10px)"
        px={{ base: 4, md: 5 }}
        py={{ base: 4, md: 6 }}
      >
        <VStack align="stretch" gap={1} mb={5}>
          <Text
            fontSize="xs"
            fontWeight="bold"
            letterSpacing="0.14em"
            textTransform="uppercase"
            color="teal.600"
          >
            Smart Proctor
          </Text>
          <Heading size="md" color="gray.800">
            Lecturer Workspace
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Exam creation, monitoring, and analytics
          </Text>
        </VStack>

        <Flex as="nav" direction={{ base: "row", md: "column" }} gap={2} overflowX={{ base: "auto", md: "visible" }} pb={1}>
          {lecturerNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end ?? false}>
              {({ isActive }) => (
                <Box
                  whiteSpace="nowrap"
                  px={4}
                  py={3}
                  rounded="xl"
                  border="1px solid"
                  borderColor={isActive ? "teal.300" : "transparent"}
                  bg={isActive ? "teal.50" : "transparent"}
                  color={isActive ? "teal.700" : "gray.700"}
                  fontSize="sm"
                  fontWeight={isActive ? "semibold" : "medium"}
                  transition="all 0.18s ease"
                  _hover={{ bg: isActive ? "teal.50" : "gray.100" }}
                >
                  {item.label}
                </Box>
              )}
            </NavLink>
          ))}
        </Flex>
      </Flex>

      <Flex direction="column" flex="1" minW={0}>
        <Flex
          align="center"
          justify="space-between"
          px={{ base: 4, md: 8 }}
          py={{ base: 4, md: 5 }}
          borderBottomWidth="1px"
          borderColor="rgba(15, 23, 42, 0.08)"
          bg="rgba(255, 255, 255, 0.7)"
          backdropFilter="blur(8px)"
        >
          <Box>
            <Text fontSize="sm" color="gray.500">
              Signed in as
            </Text>
            <Heading size="sm" color="gray.800">
              {user.fullName}
            </Heading>
          </Box>

          <Button variant="outline" colorPalette="teal" onClick={handleSignOut}>
            Sign out
          </Button>
        </Flex>

        <Box as="main" px={{ base: 4, md: 8 }} py={{ base: 5, md: 7 }}>
          <Outlet context={{ user }} />
        </Box>
      </Flex>
    </Flex>
  );
}
