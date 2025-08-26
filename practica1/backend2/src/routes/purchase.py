from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..db import db

router = APIRouter()

class PurchaseRequest(BaseModel):
    buyerId: int
    artworkId: int

@router.post("/")
async def purchase_artwork(request: PurchaseRequest):
    """
    Procesar compra de obra de arte
    
    Llama al SP transaccional sp_purchase(buyerId, artworkId)
    La lógica de negocio (locks, saldo, transferencia, notificaciones)
    vive en la base de datos.
    """
    try:
        buyer = request.buyerId
        art_id = request.artworkId

        if not buyer or not art_id:
            raise HTTPException(
                status_code=400, 
                detail="buyerId y artworkId son requeridos"
            )

        # Ejecuta el SP (él hace todo: valida, mueve saldos, transfiere, notifica)
        await db.execute_procedure('sp_purchase', [buyer, art_id])

        # Si llegó aquí, la compra se concretó
        return {
            "ok": True,
            "artworkId": art_id,
            "buyerId": buyer
        }

    except Exception as e:
        error_msg = str(e)
        
        # Errores de negocio señalados con SIGNAL 45000 desde el SP
        if ('45000' in error_msg or 
            'La obra no existe' in error_msg or
            'La obra no está disponible' in error_msg or
            'No puedes comprar tu propia obra' in error_msg or
            'Saldo insuficiente' in error_msg or
            'Vendedor no existe' in error_msg or
            'Comprador no existe' in error_msg):
            
            raise HTTPException(
                status_code=409, 
                detail=error_msg if 'La obra' in error_msg or 'No puedes' in error_msg or 'Saldo' in error_msg 
                       else "Operación inválida"
            )

        # Deadlocks o timeouts
        if 'Deadlock' in error_msg or 'Lock wait timeout' in error_msg:
            raise HTTPException(
                status_code=409, 
                detail="Conflicto de concurrencia, intenta de nuevo"
            )

        print(f"POST /purchase error: {e}")
        raise HTTPException(
            status_code=500, 
            detail="No se pudo completar la compra"
        )
