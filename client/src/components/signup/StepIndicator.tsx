import { Box, HStack, Text, VStack } from "@chakra-ui/react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <HStack align="stretch" gap={3}>
      {steps.map((label, index) => {
        const state =
          index < currentStep
            ? "complete"
            : index === currentStep
              ? "current"
              : "upcoming";

        return (
          <VStack
            key={label}
            flex="1"
            align="start"
            gap={2}
            opacity={state === "upcoming" ? 0.62 : 1}
          >
            <HStack w="full" gap={2}>
              <Box
                w="28px"
                h="28px"
                rounded="full"
                display="grid"
                placeItems="center"
                fontSize="xs"
                fontWeight="bold"
                color={state === "upcoming" ? "gray.600" : "white"}
                bg={
                  state === "complete"
                    ? "green.500"
                    : state === "current"
                      ? "blue.500"
                      : "gray.200"
                }
                transition="all 0.2s ease"
              >
                {state === "complete" ? "✓" : index + 1}
              </Box>
              <Box
                flex="1"
                h="4px"
                rounded="full"
                bg={index < currentStep ? "blue.400" : "gray.200"}
                visibility={index === steps.length - 1 ? "hidden" : "visible"}
                transition="all 0.2s ease"
              />
            </HStack>
            <Text fontSize="xs" fontWeight="semibold" color="gray.700">
              {label}
            </Text>
          </VStack>
        );
      })}
    </HStack>
  );
}
