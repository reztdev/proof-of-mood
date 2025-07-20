// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProofOfMood {
    struct MoodEntry {
        uint8 moodLevel;
        uint256 timestamp;
    }

    mapping(address => MoodEntry[]) private userMoodHistory;
    mapping(address => uint256) public lastCheckIn;

    event MoodCheckedIn(address indexed user, uint8 moodLevel, uint256 timestamp);

    function checkIn(uint8 _moodLevel) external {
        require(_moodLevel >= 1 && _moodLevel <= 5, "Mood level must be 1-5");

        uint256 currentDay = (block.timestamp + 18 hours) / 1 days;

        require((lastCheckIn[msg.sender] + 18 hours) / 1 days < currentDay, "Already checked in today");

        userMoodHistory[msg.sender].push(MoodEntry({
            moodLevel: _moodLevel,
            timestamp: block.timestamp
        }));

        lastCheckIn[msg.sender] = block.timestamp;

        emit MoodCheckedIn(msg.sender, _moodLevel, block.timestamp);
    }

    function getMoodHistory(address _user) external view returns (MoodEntry[] memory) {
        return userMoodHistory[_user];
    }

    function getMoodCount(address _user) external view returns (uint256) {
        return userMoodHistory[_user].length;
    }

    function getLatestMood(address _user) external view returns (uint8 moodLevel, uint256 timestamp) {
        uint256 len = userMoodHistory[_user].length;
        require(len > 0, "No mood history yet");

        MoodEntry memory latest = userMoodHistory[_user][len - 1];
        return (latest.moodLevel, latest.timestamp);
    }
}
