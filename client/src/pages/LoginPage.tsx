import { useState } from "react";
import {
  Stack,
  Input,
  Button,
  Text,
  Box,
  Heading,
  Card,
  CardBody,
} from "@chakra-ui/react";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { useToast } from "@chakra-ui/toast";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";

export default function LoginPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast({ title: "Missing credentials", status: "warning" });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({ title: "Login successful", status: "success" });
      navigate("/dashboard");
    }, 800);
  };

  return (
    <AuthLayout>
      <Card.Root shadow="lg" border="1px solid" borderColor="gray.200" rounded="2xl">
        <CardBody p={8}>
          <Stack gap={6}>
            <Box textAlign="center">
              <Heading size="lg" color="gray.800">Welcome Back</Heading>
              <Text color="gray.500" fontSize="sm">
                Sign in to continue
              </Text>
            </Box>

            <FormControl>
              <FormLabel color="gray.700">Email Address</FormLabel>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                size="lg"
              />
            </FormControl>

            <FormControl>
              <FormLabel color="gray.700">Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                size="lg"
              />
            </FormControl>

            <Button
              size="lg"
              onClick={handleLogin}
              loading={isLoading}
              w="full"
            >
              Sign In
            </Button>

            <Text textAlign="center" fontSize="sm" color="gray.600">
              New here? {" "}
              <Link to="/signup">
                <Text as="span" color="brand.600" fontWeight="600">
                  Create account
                </Text>
              </Link>
            </Text>
          </Stack>
        </CardBody>
      </Card.Root>
    </AuthLayout>
  );
}