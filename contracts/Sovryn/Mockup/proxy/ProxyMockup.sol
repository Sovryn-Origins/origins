pragma solidity ^0.5.17;

import "./StorageMockup.sol";
import "../../Proxy/UpgradableProxy.sol";

contract ProxyMockup is StorageMockup, UpgradableProxy {}
