import { Box, HStack, Input, Text, VStack } from "@chakra-ui/react";
import type { ChangeEvent } from "react";
import type { SignupFormData } from "./types";

interface SecurityStepProps {
  form: SignupFormData;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

const inputProps = {
  size: "lg" as const,
  bg: "white",
  color: "gray.800",
  caretColor: "gray.800",
  border: "1px solid",
  borderColor: "gray.200",
  _placeholder: { color: "gray.500" },
  _hover: { borderColor: "blue.300" },
  _focus: { borderColor: "blue.400", boxShadow: "0 0 0 1px #63B3ED" },
};

function getStrength(password: string) {
  if (password.length < 6) return 25;
  if (password.length < 8) return 50;
  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 75;
  return 100;
}

export default function SecurityStep({ form, onChange }: SecurityStepProps) {
  const strength = getStrength(form.password);
  const strengthLabel =
    strength <= 25 ? "Weak" : strength <= 50 ? "Fair" : strength <= 75 ? "Good" : "Strong";
  const strengthColor =
    strength <= 25 ? "#E53E3E" : strength <= 50 ? "#D69E2E" : strength <= 75 ? "#319795" : "#2F855A";

  return (
    <VStack align="stretch" gap={4}>
      <HStack align="start" gap={4} flexWrap="wrap">
        <Box flex="1" minW="240px">
          <label
            htmlFor="password"
            style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151" }}
          >
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            placeholder="Create a strong password"
            {...inputProps}
          />

          {form.password && (
            <Box mt={2}>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" color="gray.600">
                  Password strength
                </Text>
                <Text fontSize="xs" fontWeight="semibold" color={strengthColor}>
                  {strengthLabel}
                </Text>
              </HStack>
              <Box h="7px" rounded="full" bg="gray.100" overflow="hidden">
                <Box h="100%" w={`${strength}%`} bg={strengthColor} transition="width 0.25s ease" />
              </Box>
            </Box>
          )}
        </Box>

        <Box flex="1" minW="240px">
          <label
            htmlFor="confirmPassword"
            style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151" }}
          >
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={onChange}
            placeholder="Re-enter your password"
            {...inputProps}
          />
        </Box>
      </HStack>

      <Box
        bg="linear-gradient(145deg, rgba(239,246,255,0.95), rgba(235,248,255,0.82))"
        p={4}
        rounded="xl"
        border="1px solid"
        borderColor="blue.100"
      >
        <Text fontSize="sm" color="gray.700">
          This platform uses AI-based monitoring including webcam, microphone, and screen activity
          during examinations to ensure academic integrity.
        </Text>
      </Box>

      <VStack align="stretch" gap={3}>
        <label
          htmlFor="termsAccepted"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            padding: "12px",
            borderRadius: "0.5rem",
            border: "1px solid #BFDBFE",
            background: "rgba(255, 255, 255, 0.8)",
            cursor: "pointer",
          }}
        >
          <input
            id="termsAccepted"
            name="termsAccepted"
            type="checkbox"
            checked={form.termsAccepted}
            onChange={onChange}
            style={{
              accentColor: "#2563EB",
              width: "18px",
              height: "18px",
              marginTop: "2px",
              flexShrink: 0,
            }}
          />
          <Text fontSize="sm" color="gray.800" lineHeight="1.45">
            I agree to the <Text as="span" fontWeight="semibold">Terms of Service</Text> and{" "}
            <Text as="span" fontWeight="semibold">Privacy Policy</Text>.
          </Text>
        </label>

        <label
          htmlFor="aiConsent"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            padding: "12px",
            borderRadius: "0.5rem",
            border: "1px solid #BFDBFE",
            background: "rgba(255, 255, 255, 0.8)",
            cursor: "pointer",
          }}
        >
          <input
            id="aiConsent"
            name="aiConsent"
            type="checkbox"
            checked={form.aiConsent}
            onChange={onChange}
            style={{
              accentColor: "#2563EB",
              width: "18px",
              height: "18px",
              marginTop: "2px",
              flexShrink: 0,
            }}
          />
          <Text fontSize="sm" color="gray.800" lineHeight="1.45">
            I understand that AI monitoring tools may be used during examinations.
          </Text>
        </label>
      </VStack>
    </VStack>
  );
}
