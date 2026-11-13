'use client';

import { useEffect, useState } from 'react';
import { BOARD_TILES, BoardTile, PropertyTile } from '@/utils/boardData';
import { cn } from '@/lib/utils';

interface Player {
    id: string;
    name: string;
    color: string;
    position: number;
    is_jailed: boolean;
    money: number;
}

interface PropertyOwnership {
    tile_id: number;
    player_id: string;
    houses: number;
    hotels: number;
    is_mortgaged: boolean;
}

interface MonopolyBoardProps {
    players: Player[];
    currentPlayerId: string;
    propertyOwnerships: PropertyOwnership[];
    onTileClick?: (tile: BoardTile) => void;
}

const TileComponent = ({
    tile,
    players,
    ownership,
    onClick,
    position
}: {
    tile: BoardTile;
    players: Player[];
    ownership?: PropertyOwnership;
    onClick?: () => void;
    position: 'top' | 'right' | 'bottom' | 'left' | 'corner';
}) => {
    const playersOnTile = players.filter(p => p.position === tile.index);
    const owner = ownership ? players.find(p => p.id === ownership.player_id) : null;

    const getTileStyles = () => {
        if (tile.type === 'property') {
            const prop = tile as PropertyTile;
            return {
                borderTopColor: position === 'bottom' ? prop.color : undefined,
                borderBottomColor: position === 'top' ? prop.color : undefined,
                borderLeftColor: position === 'right' ? prop.color : undefined,
                borderRightColor: position === 'left' ? prop.color : undefined,
            };
        }
        return {};
    };

    const getTileIcon = () => {
        switch (tile.type) {
            case 'start': return '➜';
            case 'jail': return '⛓️';
            case 'go_to_jail': return '👮';
            case 'free_parking': return '🅿️';
            case 'event': return '❓';
            case 'tax': return '💰';
            case 'railroad': return '✈️';
            case 'utility': return '⚡';
            default: return null;
        }
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                "relative flex flex-col items-center justify-center p-1 border border-slate-600 bg-slate-800 hover:bg-slate-700 cursor-pointer transition-colors text-gray-100",
                position === 'corner' && "w-24 h-24",
                position !== 'corner' && "w-20 h-24",
                tile.type === 'property' && position !== 'corner' && "border-t-4"
            )}
            style={getTileStyles()}
        >
            {/* Special tile icon */}
            {tile.type !== 'property' && (
                <div className="text-2xl mb-1">{getTileIcon()}</div>
            )}

            {/* Property name */}
            <div className="text-xs text-center font-semibold leading-tight px-1">
                {tile.type === 'property' ? (tile as PropertyTile).company : tile.name}
            </div>

            {/* Property price */}
            {tile.type === 'property' && (
                <div className="text-xs text-gray-300">
                    ${(tile as PropertyTile).price}
                </div>
            )}

            {/* Houses/Hotels */}
            {ownership && (ownership.houses > 0 || ownership.hotels > 0) && (
                <div className="absolute top-0 left-0 right-0 flex justify-center gap-0.5 -mt-2">
                    {ownership.hotels > 0 ? (
                        <div className="w-4 h-4 bg-red-600 rounded-sm text-white text-xs flex items-center justify-center">H</div>
                    ) : (
                        Array.from({ length: ownership.houses }).map((_, i) => (
                            <div key={i} className="w-3 h-3 bg-green-600 rounded-sm"></div>
                        ))
                    )}
                </div>
            )}

            {/* Owner indicator */}
            {owner && (
                <div
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{ backgroundColor: owner.color }}
                />
            )}

            {/* Players on tile */}
            {playersOnTile.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex flex-wrap gap-0.5 max-w-full">
                        {playersOnTile.map((player, i) => {
                            const displayName = player.name || "";
                            const initial = displayName ? displayName[0] : "?";
                            return (
                                <div
                                    key={player.id}
                                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xs font-bold text-white"
                                    style={{ backgroundColor: player.color, zIndex: 10 + i }}
                                    title={displayName}
                                >
                                    {initial}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export function MonopolyBoard({ players, currentPlayerId, propertyOwnerships, onTileClick }: MonopolyBoardProps) {
    // Get tiles for each side
    const bottomTiles = BOARD_TILES.filter(t => t.index >= 0 && t.index <= 10);
    const leftTiles = BOARD_TILES.filter(t => t.index > 10 && t.index < 20).reverse();
    const topTiles = BOARD_TILES.filter(t => t.index >= 20 && t.index <= 30).reverse();
    const rightTiles = BOARD_TILES.filter(t => t.index > 30 && t.index < 40);

    const getOwnership = (tileId: number) => {
        return propertyOwnerships.find(o => o.tile_id === tileId);
    };

    return (
        <div className="relative bg-slate-900 p-4 rounded-lg shadow-lg border border-slate-700">
            <div className="grid grid-cols-11 gap-0 w-fit mx-auto">
                {/* Top row */}
                <div className="col-span-11 flex">
                    {topTiles.map((tile) => (
                        <TileComponent
                            key={tile.id}
                            tile={tile}
                            players={players}
                            ownership={getOwnership(tile.id)}
                            onClick={() => onTileClick?.(tile)}
                            position={tile.index === 20 || tile.index === 30 ? 'corner' : 'top'}
                        />
                    ))}
                </div>

                {/* Middle section with left and right columns */}
                <div className="col-span-11 flex">
                    {/* Left column */}
                    <div className="flex flex-col">
                        {leftTiles.map((tile) => (
                            <TileComponent
                                key={tile.id}
                                tile={tile}
                                players={players}
                                ownership={getOwnership(tile.id)}
                                onClick={() => onTileClick?.(tile)}
                                position="left"
                            />
                        ))}
                    </div>

                    {/* Center area */}
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                            <div className="text-6xl font-bold text-emerald-300 mb-2">BANKO</div>
                            <div className="text-xl text-gray-300">Tech Monopoly</div>

                            {/* Current player indicator */}
                            <div className="mt-6 p-4 bg-slate-800 rounded-lg shadow">
                                <div className="text-sm text-gray-200 mb-2">You are playing as</div>
                                <div className="flex items-center justify-center gap-2">
                                    {players.find(p => p.id === currentPlayerId) && (
                                        <>
                                            <div
                                                className="w-6 h-6 rounded-full"
                                                style={{ backgroundColor: players.find(p => p.id === currentPlayerId)?.color }}
                                            />
                                            <span className="font-semibold">
                                                {players.find(p => p.id === currentPlayerId)?.name}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="flex flex-col">
                        {rightTiles.map((tile) => (
                            <TileComponent
                                key={tile.id}
                                tile={tile}
                                players={players}
                                ownership={getOwnership(tile.id)}
                                onClick={() => onTileClick?.(tile)}
                                position="right"
                            />
                        ))}
                    </div>
                </div>

                {/* Bottom row */}
                <div className="col-span-11 flex">
                    {bottomTiles.map((tile) => (
                        <TileComponent
                            key={tile.id}
                            tile={tile}
                            players={players}
                            ownership={getOwnership(tile.id)}
                            onClick={() => onTileClick?.(tile)}
                            position={tile.index === 0 || tile.index === 10 ? 'corner' : 'bottom'}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
