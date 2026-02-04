from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import shutil
from ..database import get_db
from ..models.material import StudyMaterial
from ..models.user import User
from ..middleware.auth_middleware import get_current_user, require_admin

router = APIRouter(prefix="/api/resources", tags=["resources"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class MaterialCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_id: Optional[int] = None

@router.post("/upload")
async def upload_material(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    event_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Save file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create database entry
    material = StudyMaterial(
        title=title,
        file_name=file.filename,
        file_path=file_path,
        description=description,
        event_id=event_id,
        uploaded_by=current_user.id
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    
    return material

@router.get("/")
def get_materials(
    event_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(StudyMaterial)
    if event_id:
        query = query.filter(StudyMaterial.event_id == event_id)
    
    materials = query.order_by(StudyMaterial.uploaded_at.desc()).all()
    
    # Serialize materials with uploader info
    result = []
    for m in materials:
        uploader = db.query(User).filter(User.id == m.uploaded_by).first()
        result.append({
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "file_name": m.file_name,
            "file_path": m.file_path,
            "event_id": m.event_id,
            "uploaded_by": m.uploaded_by,
            "uploaded_by_name": uploader.full_name if uploader else "Unknown",
            "uploaded_at": m.uploaded_at.isoformat() if m.uploaded_at else None
        })
    
    return result

@router.delete("/{material_id}")
def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    material = db.query(StudyMaterial).filter(StudyMaterial.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Delete file
    if os.path.exists(material.file_path):
        os.remove(material.file_path)
    
    db.delete(material)
    db.commit()
    
    return {"message": "Material deleted successfully"}