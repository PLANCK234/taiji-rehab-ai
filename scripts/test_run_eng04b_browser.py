"""Checks for the isolated browser runner's cleanup contract."""

import subprocess
import unittest
from unittest.mock import patch

import run_eng04b_browser as runner


class CleanupResourcesTest(unittest.TestCase):
    @staticmethod
    def docker_result(command, **_kwargs):
        if command[1:3] == ["ps", "-a"]:
            return subprocess.CompletedProcess(command, 0, "shared-container\n", "")
        if command[1:3] == ["network", "ls"]:
            return subprocess.CompletedProcess(command, 0, "shared-network\n", "")
        if command[1:3] == ["image", "ls"]:
            return subprocess.CompletedProcess(command, 0, "shared-image:latest\n", "")
        return subprocess.CompletedProcess(command, 0, "", "")

    def test_cleanup_checks_exact_run_names_without_touching_shared_resources(self):
        with patch.object(runner.subprocess, "run", side_effect=self.docker_result) as run:
            runner.cleanup_resources(["taiji-eng04b-api-123"], "taiji-eng04b-123", ["taiji-eng04b-runner:123"])
        removal = [call.args[0] for call in run.call_args_list[:3]]
        self.assertEqual(removal, [
            ["docker", "stop", "taiji-eng04b-api-123"],
            ["docker", "network", "rm", "taiji-eng04b-123"],
            ["docker", "image", "rm", "taiji-eng04b-runner:123"],
        ])

    def test_remaining_resource_fails_even_if_remove_command_succeeded(self):
        def lingering(command, **kwargs):
            result = self.docker_result(command, **kwargs)
            if command[1:3] == ["network", "ls"]:
                return subprocess.CompletedProcess(command, 0, "taiji-eng04b-123\n", "")
            return result

        with (
            patch.object(runner.subprocess, "run", side_effect=lingering),
            self.assertRaisesRegex(RuntimeError, "network still exists: taiji-eng04b-123"),
        ):
            runner.cleanup_resources([], "taiji-eng04b-123", [])

    def test_unavailable_docker_cannot_count_as_verified_cleanup(self):
        def unavailable(command, **kwargs):
            if command[1:3] == ["ps", "-a"]:
                return subprocess.CompletedProcess(command, 1, "", "daemon unavailable")
            return self.docker_result(command, **kwargs)

        with (
            patch.object(runner.subprocess, "run", side_effect=unavailable),
            self.assertRaisesRegex(RuntimeError, "container verification failed"),
        ):
            runner.cleanup_resources(["taiji-eng04b-api-123"], None, [])

    def test_primary_failure_survives_cleanup_failure(self):
        build_error = subprocess.CalledProcessError(1, ["docker", "build"])
        with (
            patch.object(runner, "free_port", side_effect=[12345, 12346]),
            patch.object(runner, "docker", side_effect=build_error),
            patch.object(runner, "cleanup_resources", side_effect=RuntimeError("cleanup check failed")),
            self.assertRaises(subprocess.CalledProcessError) as raised,
        ):
            runner.main()
        self.assertIn("cleanup check failed", raised.exception.__notes__)


if __name__ == "__main__":
    unittest.main()
