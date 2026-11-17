import pytest
from ml.sit_to_stand import Sample, detect_candidates, read_samples


def series(*values):
    return [Sample(i * 100, value) for i, value in enumerate(values)]


def test_counts_observed_transitions_without_expected_count():
    result = detect_candidates(series(.7, .7, .6, .4, .4, .4, .7, .7, .4, .4))
    assert result["candidate_timestamps_ms"] == [300, 800]
    assert result["candidate_count"] == 2


def test_does_not_count_initial_stand_or_bridge_missing_samples():
    result = detect_candidates(series(.4, .4, .7, .7, None, .4, .4, .7, .7, .4, .4))
    assert result["candidate_timestamps_ms"] == [900]


def test_does_not_bridge_missing_timestamps_or_one_frame_spike():
    values = series(.7, .7, .4, .6, .4, .4, .7, .7)
    values.extend([Sample(1000, .4), Sample(1100, .4)])
    assert detect_candidates(values)["candidate_timestamps_ms"] == [400]


def test_insufficient_signal_has_unknown_count():
    assert detect_candidates(series(.7, .701, .7, .701))["candidate_count"] is None


def test_reads_pose_csv_and_rejects_nonincreasing_timestamps():
    header = b"timestamp_ms,detected,pelvis_y_normalized\n"
    assert read_samples(header + b"0,0,0\n100,1,0.7\n") == [Sample(0, None), Sample(100, .7)]
    with pytest.raises(ValueError, match="increasing"):
        read_samples(header + b"100,1,0.7\n100,1,0.7\n")
    with pytest.raises(ValueError, match="Incomplete"):
        read_samples(header + b"100,1\n")
