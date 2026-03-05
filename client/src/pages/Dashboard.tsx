import { Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { Navigate, useNavigate } from "react-router-dom";
import { clearSessionUser, getDashboardPathForRole, getSessionUser } from "../lib/authSession";

const SIGNOUT_ENDPOINT = (() => {
  const baseUrl = (import.meta.env.VITE_AUTH_API_BASE_URL ?? "").trim();
  if (!baseUrl) {
    return "/api/users/signout";
  }

  return `${baseUrl.replace(/\/+$/, "")}/api/users/signout`;
})();

export default function Dashboard() {
  const user = getSessionUser();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== "admin") {
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
    <Flex minH="100vh" align="center" justify="center" bg="linear-gradient(160deg, #f4f7fb 0%, #eaf0ff 65%, #edf4ff 100%)" p={5}>
      <Box
        maxW="640px"
        w="full"
        rounded="3xl"
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        shadow="0 18px 40px rgba(15, 23, 42, 0.11)"
        p={{ base: 6, md: 8 }}
      >
        <VStack align="stretch" gap={4}>
          <Text
            fontSize="xs"
            fontWeight="bold"
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="blue.600"
          >
            Role Dashboard
          </Text>
          <Heading size="lg" color="gray.800">
            Admin workspace
          </Heading>
          <Text color="gray.600">
            Role-specific dashboards are configured for both students and lecturers.
          </Text>
          <Text color="gray.600">
            Use this admin route as the foundation for user management, audit controls, and platform settings.
          </Text>
          <Button onClick={handleSignOut} w="fit-content" variant="outline" colorPalette="blue">
            Sign out
          </Button>
        </VStack>
      </Box>
    </Flex>
  );
}
