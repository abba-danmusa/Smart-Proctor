import { Box, Input } from "@chakra-ui/react";
import type { ChangeEvent } from "react";
import type { SignupFormData } from "./types";

interface AccountDetailsStepProps {
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

export default function AccountDetailsStep({ form, onChange }: AccountDetailsStepProps) {
  return (
    <Box display="grid" gap={4}>
      <Box>
        <label
          htmlFor="fullName"
          style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151" }}
        >
          Full Name
        </label>
        <Input
          id="fullName"
          name="fullName"
          value={form.fullName}
          onChange={onChange}
          placeholder="Jane Doe"
          {...inputProps}
        />
      </Box>

      <Box>
        <label
          htmlFor="organization"
          style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151" }}
        >
          School / Organization
        </label>
        <Input
          id="organization"
          name="organization"
          value={form.organization}
          onChange={onChange}
          placeholder="Riverside University"
          {...inputProps}
        />
      </Box>

      <Box>
        <label
          htmlFor="email"
          style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151" }}
        >
          Email Address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={onChange}
          placeholder="name@school.edu"
          {...inputProps}
        />
      </Box>

      <Box>
        <label
          htmlFor="role"
          style={{ display: "block", fontSize: "14px", fontWeight: 600, color: "#374151" }}
        >
          I am registering as
        </label>
        <select
          id="role"
          name="role"
          value={form.role}
          onChange={onChange}
          style={{
            width: "100%",
            height: "44px",
            padding: "0 16px",
            borderRadius: "0.5rem",
            border: "1px solid #E2E8F0",
            background: "#FFFFFF",
            color: "#1F2937",
            outline: "none",
          }}
        >
          <option value="student">Student</option>
          <option value="lecturer">Lecturer / Instructor</option>
          <option value="admin">Administrator</option>
        </select>
      </Box>
    </Box>
  );
}
