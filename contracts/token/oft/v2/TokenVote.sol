// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "./BaseOFTV2.sol";

contract TokenVote is Ownable, BaseOFTV2, ERC20, ERC20Permit, ERC20Votes {
    uint256 internal immutable ld2sdRate;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _sharedDecimals,
        address _lzEndpoint
    )
        ERC20(_name, _symbol)
        BaseOFTV2(_sharedDecimals, _lzEndpoint)
        ERC20Permit(_name)
    {
        uint8 decimals = decimals();
        require(
            _sharedDecimals <= decimals,
            "OFT: sharedDecimals must be <= decimals"
        );
        ld2sdRate = 10**(decimals - _sharedDecimals);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    function circulatingSupply()
        public
        view
        virtual
        override
        returns (uint256)
    {
        return totalSupply();
    }

    function token() public view virtual override returns (address) {
        return address(this);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }
    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }
    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }

    function _debitFrom(
        address _from,
        uint16,
        bytes32,
        uint256 _amount
    ) internal virtual override returns (uint256) {
        address spender = _msgSender();
        if (_from != spender) _spendAllowance(_from, spender, _amount);
        _burn(_from, _amount);
        return _amount;
    }

    function _creditTo(
        uint16,
        address _toAddress,
        uint256 _amount
    ) internal virtual override returns (uint256) {
        _mint(_toAddress, _amount);
        return _amount;
    }

    function _transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) internal virtual override returns (uint256) {
        address spender = _msgSender();
        if (_from != address(this) && _from != spender)
            _spendAllowance(_from, spender, _amount);
        _transfer(_from, _to, _amount);
        return _amount;
    }

    function _ld2sdRate() internal view virtual override returns (uint256) {
        return ld2sdRate;
    }
}
