import { Badge, Box, Button, Heading, HStack, Image, Text, VStack } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import FaceRegistrationStep from "../../components/signup/FaceRegistrationStep";
import { saveSessionUser } from "../../lib/authSession";
import type { StudentLayoutOutletContext } from "./StudentDashboardLayout";
import { getDeviceStateColor, getDeviceStateLabel, useDeviceStatus } from "./useDeviceStatus";

export default function StudentProfileFaceIdPage() {
  const { user } = useOutletContext<StudentLayoutOutletContext>();
  const [capture, setCapture] = useState<string | null>(user.faceCapture ?? null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(user.faceVerifiedAt ?? null);
  const { snapshot, refresh } = useDeviceStatus();

  const registeredDeviceSummary = useMemo(() => {
    const cameraLabel = getDeviceStateLabel(snapshot.camera);
    const microphoneLabel = getDeviceStateLabel(snapshot.microphone);
    return `Camera: ${cameraLabel} | Microphone: ${microphoneLabel}`;
  }, [snapshot.camera, snapshot.microphone]);

  const onCapture = (dataUrl: string) => {
    const nowIso = new Date().toISOString();
    setCapture(dataUrl);
    setUpdatedAt(nowIso);
    saveSessionUser({
      ...user,
      faceCapture: dataUrl,
      faceVerifiedAt: nowIso,
    });
  };

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="gray.800" mb={1}>
          Profile & Face ID
        </Heading>
        <Text color="gray.600">Manage biometric identity data and verify your registered exam device status.</Text>
      </Box>

      <HStack align="stretch" gap={4} flexWrap="wrap">
        <Box
          flex="1"
          minW={{ base: "100%", md: "290px" }}
          rounded="2xl"
          border="1px solid"
          borderColor="rgba(15, 23, 42, 0.08)"
          bg="white"
          p={5}
          shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
        >
          <Heading size="sm" color="gray.800" mb={4}>
            Stored Face Capture
          </Heading>

          {capture ? (
            <Image src={capture} alt="Stored face capture" rounded="xl" border="1px solid" borderColor="blue.100" />
          ) : (
            <Box rounded="xl" p={6} bg="gray.100" color="gray.600" textAlign="center" fontSize="sm">
              No face capture stored yet.
            </Box>
          )}

          <Text fontSize="sm" color="gray.600" mt={4}>
            {updatedAt ? `Face ID last updated: ${new Date(updatedAt).toLocaleString()}` : "Face ID has not been verified yet."}
          </Text>
        </Box>

        <Box
          flex="1"
          minW={{ base: "100%", md: "290px" }}
          rounded="2xl"
          border="1px solid"
          borderColor="rgba(15, 23, 42, 0.08)"
          bg="white"
          p={5}
          shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
        >
          <Heading size="sm" color="gray.800" mb={4}>
            Registered Device
          </Heading>
          <VStack align="stretch" gap={3}>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">
                Camera
              </Text>
              <Badge colorPalette={getDeviceStateColor(snapshot.camera)}>{getDeviceStateLabel(snapshot.camera)}</Badge>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">
                Microphone
              </Text>
              <Badge colorPalette={getDeviceStateColor(snapshot.microphone)}>
                {getDeviceStateLabel(snapshot.microphone)}
              </Badge>
            </HStack>
          </VStack>
          <Text mt={4} fontSize="sm" color="gray.600">
            {registeredDeviceSummary}
          </Text>
          <Button mt={4} size="sm" variant="outline" colorPalette="blue" onClick={() => void refresh()}>
            Refresh Device Status
          </Button>
        </Box>
      </HStack>

      <Box
        rounded="2xl"
        border="1px solid"
        borderColor="rgba(15, 23, 42, 0.08)"
        bg="white"
        p={5}
        shadow="0 12px 30px rgba(15, 23, 42, 0.08)"
      >
        <Heading size="sm" color="gray.800" mb={3}>
          Re-register Face ID
        </Heading>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Capture a new face snapshot if your appearance has changed or verification quality is low.
        </Text>
        <FaceRegistrationStep capture={capture} onCapture={onCapture} />
      </Box>
    </VStack>
  );
}
