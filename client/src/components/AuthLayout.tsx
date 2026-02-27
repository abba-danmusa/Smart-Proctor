import { Box, Container } from "@chakra-ui/react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      minH="100vh"
      bg="white"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Container maxW="lg">{children}</Container>
    </Box>
  );
}