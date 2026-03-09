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

const studentNavigationItems: Array<{ label: string; to: string; end?: boolean }> = [
  { label: "Dashboard", to: "/dashboard/student", end: true },
  { label: "Courses", to: "/dashboard/student/courses" },
  { label: "My Exams", to: "/dashboard/student/exams" },
  { label: "Results", to: "/dashboard/student/results" },
  { label: "Profile & Face ID", to: "/dashboard/student/profile" },
  { label: "Settings", to: "/dashboard/student/settings" },
];

export interface StudentLayoutOutletContext {
  user: SessionUser;
}

export default function StudentDashboardLayout() {
  const user = getSessionUser();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== "student") {
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
    <Flex minH="100vh" bg="linear-gradient(165deg, #f4f7fb 0%, #e9f1ff 52%, #f8f3ec 100%)">
      <Flex
        as="aside"
        direction={{ base: "column", md: "column" }}
        w={{ base: "full", md: "270px" }}
        borderRightWidth={{ base: "0px", md: "1px" }}
        borderBottomWidth={{ base: "1px", md: "0px" }}
        borderColor="rgba(15, 23, 42, 0.09)"
        bg="rgba(255, 255, 255, 0.88)"
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
            color="blue.500"
          >
            Smart Proctor
          </Text>
          <Heading size="md" color="gray.800">
            Student Portal
          </Heading>
          <Text fontSize="sm" color="gray.600">
            Proctored exam operations
          </Text>
        </VStack>

        <Flex as="nav" direction={{ base: "row", md: "column" }} gap={2} overflowX={{ base: "auto", md: "visible" }} pb={1}>
          {studentNavigationItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end ?? false}>
              {({ isActive }) => (
                <Box
                  whiteSpace="nowrap"
                  px={4}
                  py={3}
                  rounded="xl"
                  border="1px solid"
                  borderColor={isActive ? "blue.300" : "transparent"}
                  bg={isActive ? "blue.50" : "transparent"}
                  color={isActive ? "blue.700" : "gray.700"}
                  fontSize="sm"
                  fontWeight={isActive ? "semibold" : "medium"}
                  transition="all 0.18s ease"
                  _hover={{ bg: isActive ? "blue.50" : "gray.100" }}
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
          bg="rgba(255, 255, 255, 0.66)"
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

          <Button variant="outline" colorPalette="blue" onClick={handleSignOut}>
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
