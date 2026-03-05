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

  if (user.role === "student") {
    return <Navigate to={getDashboardPathForRole("student")} replace />;
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
            {user.role[0].toUpperCase()}
            {user.role.slice(1)} workspace
          </Heading>
          <Text color="gray.600">
            Your role-specific dashboard is authenticated. Student dashboard pages are fully enabled at
            {` ${getDashboardPathForRole("student")}.`}
          </Text>
          <Text color="gray.600">
            This role view can now be expanded with lecturer/admin modules (exam creation, invigilation monitoring, and user management).
          </Text>
          <Button onClick={handleSignOut} w="fit-content" variant="outline" colorPalette="blue">
            Sign out
          </Button>
        </VStack>
      </Box>
    </Flex>
  );
}
